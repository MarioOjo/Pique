import {randomUUID} from "node:crypto";
import {getStorage} from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";
import {pixabayApiKey} from "../config";

// A photo saved for a card, ready for the app to show.
export interface CardImage {
  imageUrl: string;
  // Shown on the photo, as Pixabay's terms ask.
  imageCredit: string;
  // Read out by screen readers.
  imageAlt: string;
}

interface PixabayHit {
  webformatURL: string;
  tags: string;
  user: string;
}

const SEARCH_URL = "https://pixabay.com/api/";
// Long enough for a slow response, short enough not to hold up a session.
const REQUEST_TIMEOUT_MS = 5000;
// Pixabay's 640px "webformat" size suits a phone card and keeps files small.
const MIN_WIDTH = 640;
const STORAGE_FOLDER = "card-images";

/**
 * Searches Pixabay for a landscape, safe-search photo.
 * @param {string} query What the photo should show.
 * @return {Promise<PixabayHit | null>} The best match, or null if none.
 */
async function search(query: string): Promise<PixabayHit | null> {
  const params = new URLSearchParams({
    key: pixabayApiKey.value(),
    q: query.slice(0, 100),
    image_type: "photo",
    orientation: "horizontal",
    safesearch: "true",
    min_width: String(MIN_WIDTH),
    per_page: "3",
  });
  const response = await fetch(`${SEARCH_URL}?${params}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Pixabay search: HTTP ${response.status}`);
  const body = (await response.json()) as {hits?: PixabayHit[]};
  return body.hits?.[0] ?? null;
}

/**
 * Copies a photo into Firebase Storage. Pixabay doesn't allow permanent
 * links to its own servers, so each card keeps its own copy.
 * @param {string} sourceUrl The Pixabay image URL.
 * @param {string} cardId The card the photo belongs to.
 * @return {Promise<string>} A public download URL for the stored copy.
 */
async function store(sourceUrl: string, cardId: string): Promise<string> {
  const response = await fetch(sourceUrl, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Image download: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());

  const bucket = getStorage().bucket();
  const path = `${STORAGE_FOLDER}/${cardId}.jpg`;
  // A download token makes the URL readable without signing in, the same
  // way Firebase's own getDownloadURL works.
  const token = randomUUID();
  await bucket.file(path).save(data, {
    contentType: response.headers.get("content-type") ?? "image/jpeg",
    metadata: {
      cacheControl: "public, max-age=604800",
      metadata: {firebaseStorageDownloadTokens: token},
    },
  });
  return "https://firebasestorage.googleapis.com/v0/b/" +
    `${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/**
 * Finds, stores and describes a photo for a card. Tries Frank's search
 * phrase first, then the topic. A card without a photo still works, so
 * every failure ends in null rather than an error.
 * @param {string} cardId The card's Firestore ID.
 * @param {string} query Frank's search phrase for this card.
 * @param {string} topic The card's topic name, as a fallback search.
 * @return {Promise<CardImage | null>} The stored photo, or null.
 */
export async function findCardImage(
  cardId: string,
  query: string,
  topic: string,
): Promise<CardImage | null> {
  try {
    const hit = (query.trim() && await search(query)) || await search(topic);
    if (!hit) return null;
    const imageUrl = await store(hit.webformatURL, cardId);
    return {
      imageUrl,
      imageCredit: `${hit.user} / Pixabay`,
      imageAlt: `Photo: ${hit.tags}`,
    };
  } catch (error) {
    logger.warn("Card image failed", {
      cardId,
      query,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
