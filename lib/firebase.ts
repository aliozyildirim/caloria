import firebase from '@react-native-firebase/app';
import '@react-native-firebase/firestore';
import '@react-native-firebase/storage';
import '@react-native-firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB3G8fzF7OesEwcyCcftTGNCCPHQsdAyNo",
  projectId: "caloria-a35a6",
  storageBucket: "caloria-a35a6.firebasestorage.app",
  appId: "1:698846382043:android:81483358b32471333489fe",
  // Android için ek yapılandırma
  messagingSenderId: "698846382043",
};

// Firebase'i başlat
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export const storage = firebase.storage();
export const auth = firebase.auth();

export default firebase; 