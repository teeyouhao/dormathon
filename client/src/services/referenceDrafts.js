const DATABASE_NAME = 'viralReels_referenceDrafts';
const STORE_NAME = 'clips';
const ALLOWED_PARTS = new Set(['part-2', 'part-3']);
const METADATA_TIMEOUT_MS = 12_000;

function storageError(action, cause) {
  const detail = cause ? ` ${cause.name || 'Error'}: ${cause.message || cause}` : '';
  return new Error(`Reference draft ${action} failed.${detail}`, { cause });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    let request;
    let db;
    let failed = false;
    const fail = (action, cause) => {
      failed = true;
      if (db) db.close();
      reject(storageError(action, cause));
    };

    try {
      if (typeof indexedDB === 'undefined') {
        throw new Error('IndexedDB is unavailable in this environment.');
      }
      request = indexedDB.open(DATABASE_NAME, 1);
    } catch (error) {
      fail('database open', error);
      return;
    }

    request.onblocked = () => {
      fail('database open', new Error('The database upgrade is blocked by another open connection.'));
    };
    request.onerror = () => fail('database open', request.error);
    request.onupgradeneeded = () => {
      db = request.result;
      if (failed) {
        request.transaction.abort();
        db.close();
        return;
      }
      try {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      } catch (error) {
        fail('database upgrade', error);
        request.transaction.abort();
      }
    };
    request.onsuccess = () => {
      db = request.result;
      // A blocked open can still succeed after its promise has rejected.
      if (failed) {
        db.close();
        return;
      }
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

async function transact(storageId, mode, action, createRequest) {
  if (typeof storageId !== 'string' || !storageId.trim()) {
    throw new TypeError('Reference draft storageId must be a non-empty string.');
  }

  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      let transaction;
      let result;
      let requestError;
      try {
        transaction = db.transaction(STORE_NAME, mode);
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = (event) => {
          requestError = event.target.error || transaction.error;
          reject(storageError(action, requestError));
        };
        transaction.onabort = () => reject(storageError(
          action,
          requestError || transaction.error || new Error('The transaction was aborted.'),
        ));

        const request = createRequest(transaction.objectStore(STORE_NAME));
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => { requestError = request.error; };
      } catch (error) {
        if (transaction) transaction.abort();
        reject(storageError(action, error));
      }
    });
  } finally {
    db.close();
  }
}

export async function readReferenceDraft(storageId) {
  const draft = await transact(storageId, 'readonly', 'read', (store) => store.get(storageId));
  return draft === undefined ? {} : draft;
}

export async function writeReferenceDraft(storageId, assetsArray) {
  if (!Array.isArray(assetsArray)) {
    throw new TypeError('Reference draft assets must be an array of { partId, file } entries.');
  }
  const draft = {};
  for (const asset of assetsArray) {
    if (!asset || !ALLOWED_PARTS.has(asset.partId)) {
      throw new TypeError('Reference draft partId must be part-2 or part-3.');
    }
    if (Object.prototype.hasOwnProperty.call(draft, asset.partId)) {
      throw new TypeError(`Reference draft contains duplicate partId ${asset.partId}.`);
    }
    if (typeof File === 'undefined' || !(asset.file instanceof File)) {
      throw new TypeError(`Reference draft ${asset.partId} must contain a File.`);
    }
    draft[asset.partId] = asset.file;
  }
  // Versioned IDs are immutable: add rejects collisions instead of overwriting.
  await transact(storageId, 'readwrite', 'write (storageId must be unique)', (store) => (
    store.add(draft, storageId)
  ));
}

export async function deleteReferenceDraft(storageId) {
  await transact(storageId, 'readwrite', 'delete', (store) => store.delete(storageId));
}

export async function readVideoDuration(url) {
  if (typeof url !== 'string' || !url.trim()) {
    throw new TypeError('Video metadata URL must be a non-empty string.');
  }
  if (typeof document === 'undefined') {
    throw new Error('Video metadata decoding requires a browser document.');
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    let timer;
    let settled = false;

    const finish = (error, duration) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('error', onError);
      try {
        video.removeAttribute('src');
        video.load();
      } catch (cleanupError) {
        reject(error || new Error('Video metadata cleanup failed.', { cause: cleanupError }));
        return;
      }
      if (error) reject(error);
      else resolve(duration);
    };
    const onMetadata = () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        finish(new Error(`Video metadata has an invalid duration: ${duration}.`));
        return;
      }
      finish(null, duration);
    };
    const onError = () => {
      const mediaError = video.error;
      const detail = mediaError ? ` Media error ${mediaError.code}: ${mediaError.message || 'unknown error'}.` : '';
      finish(new Error(`Video metadata could not be loaded or decoded; the source or codec may be unsupported.${detail}`));
    };

    video.preload = 'metadata';
    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('error', onError);
    timer = setTimeout(() => {
      finish(new Error('Video metadata decoding timed out after 12 seconds.'));
    }, METADATA_TIMEOUT_MS);
    try {
      video.src = url;
      video.load();
    } catch (error) {
      finish(new Error('Video metadata loading failed.', { cause: error }));
    }
  });
}
