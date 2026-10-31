// Content of the "About Me" board (boardLinks.js draws it). The notes re-wrap and shrink
// their text to fit, so any length works.
export const ABOUT = {
  name: 'Rakhat Bektas',
  role: 'Full-Stack Software Developer',
  bio: [
    "I'm a full-stack developer with a Computing Science degree from Thompson Rivers University in Canada. " +
      'I build web apps with React, Next.js, Node.js and MySQL, and most recently added bank-feed and payroll ' +
      "features to Books77's accounting platform.",
    'I also like projects that mix code with something more: machine-learning models that catch phishing sites, ' +
      "procedural games in Unity, and this 3D desk you're looking at. I speak English, Russian and Kazakh, " +
      'and I am open to remote developer roles.'
  ],
  skills: [
    'JavaScript, Python, Java, C#, PHP',
    'React, Next.js, Node.js',
    'MySQL & REST APIs',
    'scikit-learn & pandas',
    'Three.js, Unity, Blender',
    'Git & GitHub'
  ],
  email: 'rakhatbektas@gmail.com',
  photo: '/images/photo.jpg' // in public/; cropped to fill the polaroid, null shows a placeholder
};
