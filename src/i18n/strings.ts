import type { Lang } from '@/types';

/** UI chrome strings in English, Marathi and Hindi (NFR: design for all three from the first screen). */
const dict = {
  today: { en: 'Today', mr: 'आज', hi: 'आज' },
  decide: { en: 'Decide', mr: 'निर्णय', hi: 'निर्णय' },
  ask: { en: 'Ask', mr: 'विचारा', hi: 'पूछें' },
  office: { en: 'Office', mr: 'कार्यालय', hi: 'कार्यालय' },
  calendar: { en: 'Calendar', mr: 'दिनदर्शिका', hi: 'कैलेंडर' },
  briefing: { en: 'Briefing', mr: 'ब्रीफिंग', hi: 'ब्रीफिंग' },
  tasks: { en: 'Tasks', mr: 'कार्ये', hi: 'कार्य' },
  meetings: { en: 'Meetings', mr: 'बैठका', hi: 'बैठकें' },
  documents: { en: 'Documents', mr: 'कागदपत्रे', hi: 'दस्तावेज़' },
  visitors: { en: 'Visitors', mr: 'अभ्यागत', hi: 'आगंतुक' },
  queue: { en: 'Queue', mr: 'रांग', hi: 'कतार' },
  notifications: { en: 'Notifications', mr: 'सूचना', hi: 'सूचनाएँ' },
  settings: { en: 'Settings', mr: 'सेटिंग्ज', hi: 'सेटिंग्स' },
  signOut: { en: 'Sign out', mr: 'बाहेर पडा', hi: 'साइन आउट' },
  search: { en: 'Search or jump to…', mr: 'शोधा किंवा जा…', hi: 'खोजें या जाएँ…' },
  approve: { en: 'Approve', mr: 'मंजूर', hi: 'स्वीकृत' },
  reject: { en: 'Reject', mr: 'नाकारा', hi: 'अस्वीकार' },
  edit: { en: 'Edit', mr: 'संपादन', hi: 'संपादित' },
  save: { en: 'Save', mr: 'जतन करा', hi: 'सहेजें' },
  cancel: { en: 'Cancel', mr: 'रद्द', hi: 'रद्द' },
  callPA: { en: 'Call PA', mr: 'PA ला कॉल', hi: 'PA को कॉल' },
  openBriefing: { en: 'Open briefing', mr: 'ब्रीफिंग उघडा', hi: 'ब्रीफिंग खोलें' },
  fixedCommitments: { en: 'Fixed commitments', mr: 'निश्चित कार्यक्रम', hi: 'निश्चित कार्यक्रम' },
  dueToday: { en: 'Due today', mr: 'आज देय', hi: 'आज देय' },
  oneAlert: { en: 'One alert', mr: 'एक सूचना', hi: 'एक अलर्ट' },
  nothingNeedsYou: { en: 'Nothing needs you right now', mr: 'सध्या आपली गरज नाही', hi: 'अभी आपकी ज़रूरत नहीं' },
  syntheticBanner: { en: 'SYNTHETIC DATA · NOT FOR REAL RECORDS UNTIL GATE 0', mr: 'कृत्रिम डेटा · गेट 0 पर्यंत खऱ्या नोंदी नाहीत', hi: 'कृत्रिम डेटा · गेट 0 तक वास्तविक रिकॉर्ड नहीं' },
  register: { en: 'Register and issue token', mr: 'नोंदणी करा व टोकन द्या', hi: 'पंजीकरण करें और टोकन दें' },
  name: { en: 'Name', mr: 'नाव', hi: 'नाम' },
  mobile: { en: 'Mobile', mr: 'मोबाईल', hi: 'मोबाइल' },
  category: { en: 'Category', mr: 'प्रकार', hi: 'श्रेणी' },
  ward: { en: 'Ward', mr: 'प्रभाग', hi: 'वार्ड' },
  purpose: { en: 'Purpose', mr: 'उद्देश', hi: 'उद्देश्य' },
  requestMeeting: { en: 'Request a meeting', mr: 'भेटीची विनंती', hi: 'मुलाकात का अनुरोध' },
  submit: { en: 'Send OTP and submit', mr: 'OTP पाठवा व सादर करा', hi: 'OTP भेजें और सबमिट करें' },
  privacyNotice: { en: 'I have read the privacy notice (v1.2) — what we keep and for how long', mr: 'मी गोपनीयता सूचना (v1.2) वाचली आहे — काय ठेवले जाते व किती काळ', hi: 'मैंने गोपनीयता सूचना (v1.2) पढ़ी है — क्या रखा जाता है और कितने समय तक' },
  checkStatus: { en: 'Check status', mr: 'स्थिती पहा', hi: 'स्थिति देखें' },
  welcome: { en: 'Welcome', mr: 'स्वागत', hi: 'स्वागत' },
  peaceMode: { en: 'Peace Mode', mr: 'शांतता मोड', hi: 'शांति मोड' },
} as const;

export type StringKey = keyof typeof dict;
export const translate = (key: StringKey, lang: Lang) => dict[key]?.[lang] ?? dict[key]?.en ?? key;
export const LANG_LABEL: Record<Lang, string> = { en: 'English', mr: 'मराठी', hi: 'हिन्दी' };
export const SPEECH_LANG: Record<Lang, string> = { en: 'en-IN', mr: 'mr-IN', hi: 'hi-IN' };
