import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const sendReactionNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { tokens, notification, messageData } = data;

  try {
    const message = {
      notification: notification,
      data: messageData,
      tokens: tokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    return { success: true, results: response.responses };
  } catch (error) {
    console.error('Error sending notification:', error);
    throw new functions.https.HttpsError('internal', 'Error sending notification');
  }
});
