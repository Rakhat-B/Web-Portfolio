// One entry per folder on the desk, in FOLDER_SLOTS order (the desk has 8 spots).
// Fill in what you have; anything left out is hidden on the folder's pages.
//
//   title        folder hover label and page heading
//   description  a few sentences on the left page
//   github       repo link, e.g. 'https://github.com/Rakhat-B/my-project'
//   documents    PDFs in public/projects/<folder>/, most important first. The first is shown
//                prominently, the rest as smaller links under "More documents", e.g.
//                [{ title: 'final report', pdf: '/projects/project-1/final-report.pdf' },
//                 { title: 'evaluation paper', pdf: '/projects/project-1/evaluation.pdf' }]
//   slides       Google Slides "Publish to web" → Embed link (the src="…" part),
//                e.g. 'https://docs.google.com/presentation/d/e/2PACX-…/embed?start=false&loop=false'
//   audio        optional voice-over, e.g. '/projects/project-1/explainer.mp3'
export const PROJECTS = [
  { title: 'Phishing Website Detector', 
    description: 'Machine learning model for detecting phishing websites.', 
    github: '', 
    documents: [
      {title: 'final report', pdf: '/projects/PhishingWebsiteDetector/ProjectReportML_T00686769.pdf'},
      {title: 'technical report', pdf: '/projects/PhishingWebsiteDetector/TechnicalReport.pdf'}
    ], 
    slides: 'https://docs.google.com/presentation/d/e/2PACX-1vQjz_Pzb2zQLw8QwUeE3Gw5mKSmv9YeuZNXOJtGBBMD4sNs57T2gyKqWFxUBhFhZE16-Jn5coGSoQQ4/pubembed?start=false&loop=false&delayms=3000', 
    audio: '' },
  { title: 'Ne Angime Website', 
    description: 'Ne Angime website. This website is similar to Reddit and Quora. On these websites people are able to ask question and get answers from different people around the world and post topics. On Ne angime users will be able to create accounts, follow friends, post questions or topics, post answers and react to posts.', 
    github: '', 
    documents: [{title: 'project description', pdf: '/projects/NeAngime/project_description_RakhatB_T00686769.pdf'}], 
    slides: '', 
    audio: '' },
  { title: 'Store Runner Game', description: 'First-person runner game built with Unity. Where players can run through a procedurally generated store maze and collect main item to return back to the starting point. While running, players must avoid obstacles and enemies to survive.', 
    github: '', 
    documents: [{title: 'project report', pdf: 'public/projects/StoreRunner/Report_ProjectPCG.pdf'}], 
    slides: 'https://www.canva.com/design/DAGYRB_RKAE/SGmN4GqumuMqdVwj-Vgv8g/view?embed', 
    audio: '' },
  { title: 'Game Recomendation Bot', 
    description: 'Game recommendation bot that suggests games based on user preferences. This bot can run on telegram.', 
    github: '', 
    documents: [{title: 'project report', pdf: 'public/projects/GmRecAiBot/Game recommendation_report.pdf'}], 
    slides: '', 
    audio: '' },
  { title: 'Qazaq Alphabet App', 
    description: 'An easy to use mobile application that helps users learn the Qazaq alphabet. The app provides interactive alphabet charts, quizzes, and audio pronunciations to enhance the learning experience.', 
    github: '', 
    documents: [{title: 'project report', pdf: 'public/projects/QazaqAlphabetApp/Rakhat_Bektas_COMP2160_FinalReport.pdf'}], 
    slides: 'https://docs.google.com/presentation/d/e/2PACX-1vQBqyDcN7Ub_RIL_d0GuMGEX5UfGSoSf04pDOhGKiAdzproTNdymX0eY-BEFL4u5qBWrFjtvGWZ0m7e/pubembed?start=false&loop=false&delayms=3000', 
    audio: '' },
  { title: 'Project 6', description: '', github: '', documents: [], slides: '', audio: '' },
  { title: 'Project 7', description: '', github: '', documents: [], slides: '', audio: '' },
  { title: 'Project 8', description: '', github: '', documents: [], slides: '', audio: '' }
];
