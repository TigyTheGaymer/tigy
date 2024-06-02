/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCustomEventPublished } from 'firebase-functions/v2/eventarc';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Image, IMAGE_ITEM_COLLECTION, ImageItem } from '@tigy/shared';
import { getDownloadURL, getStorage } from 'firebase-admin/storage';

initializeApp();

const REGION = 'europe-west6';

export const onImageResize = onCustomEventPublished(
  {
    eventType: 'firebase.extensions.storage-resize-images.v1.onSuccess',
    channel: 'projects/tigy-165cc/locations/europe-west4/channels/firebase',
    region: 'europe-west4' // use netherlands location because zurich doesn't exist for event (yet)
  },
  async (event) => {
    const SMALL_RES = '500x500';
    const BIG_RES = '2000x2000';

    const uid = event.subject.match(/image-items\/([a-f0-9-]+)\/image/)?.[1];

    const smallPath = `${event.subject}_${SMALL_RES}`;
    const smallUrl = await getDownloadURL(getStorage().bucket().file(smallPath));
    const imageSmall: Image = {
      fullPath: smallPath,
      downloadUrl: smallUrl
    };

    const bigPath = `${event.subject}_${BIG_RES}`;
    const bigUrl = await getDownloadURL(getStorage().bucket().file(bigPath));
    const imageBig = {
      fullPath: bigPath,
      downloadUrl: bigUrl
    };

    return getFirestore()
      .collection(IMAGE_ITEM_COLLECTION)
      .doc(uid)
      .update({ imageSmall, imageBig } as Partial<ImageItem>);
  }
);
