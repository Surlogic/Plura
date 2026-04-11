import createIconSet from '@expo/vector-icons/createIconSet';

const ioniconsGlyphMap = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');

export const Ionicons = createIconSet(
  ioniconsGlyphMap,
  'ionicons',
  require('../../assets/fonts/Ionicons.ttf'),
);
