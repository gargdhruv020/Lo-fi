export interface CatalogTrack {
  id: string;
  title: string;
  artist: string;
  season: number;
  url: string;
  cover: string;
  isFavourite?: boolean;
  category?: string;
  era?: "1950-70s" | "1980-90s" | "2000-09s" | "2010-19s" | "2020s & Beyond";
}

export { getRetroInstrumentalCatalog, type RetroEra } from "./retroCatalog";



const coverPool = [
  "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1487180142328-0c4e37023af5?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1482440308425-276ad0f28b19?q=80&w=300&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1526218626217-dc65a29bb444?q=80&w=300&auto=format&fit=crop",
];

const getHash = (str: string, max: number) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % max;
};

const rawSongsData: { season: number; artist: string; titles: string[] }[] = [
  // ===== PART 1: 90s & 2000s Bollywood Lofi Flips =====
  { season: 1, artist: "Aashiqui 2", titles: ["Tum Hi Ho (Lofi Flip)"] },
  { season: 1, artist: "Kal Ho Naa Ho", titles: ["Kal Ho Naa Ho (Lofi Flip)"] },
  { season: 1, artist: "Tum Mile", titles: ["Tum Mile (Lofi Flip)", "Dil Ibaadat (Lofi Flip)"] },
  { season: 1, artist: "Jannat", titles: ["Zara Sa (Lofi Flip)"] },
  { season: 1, artist: "Jannat 2", titles: ["Tujhe Sochta Hoon (Lofi Flip)"] },
  { season: 1, artist: "Life in a... Metro", titles: ["In Dino (Lofi Flip)"] },
  { season: 1, artist: "Race 2", titles: ["Be Intehaan (Lofi Mix)"] },
  { season: 1, artist: "Badlapur", titles: ["Jeena Jeena (Lofi Flip)"] },
  { season: 1, artist: "Jo Jeeta Wohi Sikandar", titles: ["Pehla Nasha (Lofi Chill Mix)"] },
  { season: 1, artist: "Rockstar", titles: ["Tum Ho (Lofi Flip)", "Kun Faya Kun (Lofi Vibe)"] },
  { season: 1, artist: "Shor in the City", titles: ["Saibo (Lofi Flip)"] },
  { season: 1, artist: "Wake Up Sid", titles: ["Iktara (Lofi Flip)"] },
  { season: 1, artist: "Om Shanti Om", titles: ["Ajab Si (Lofi Flip)", "Main Agar Kahoon (Lofi Vibe)"] },
  { season: 1, artist: "Yeh Jawaani Hai Deewani", titles: ["Kabira (Lofi Flip)", "Ilahi (Lofi Chill)", "Subhanallah (Lofi Mix)"] },
  { season: 1, artist: "Jab We Met", titles: ["Tum Se Hi (Lofi Flip)", "Aaoge Jab Tum (Lofi Version)"] },
  { season: 1, artist: "Haider", titles: ["Khul Kabhi Toh (Lofi Flip)"] },
  { season: 1, artist: "Zeher", titles: ["Agar Tum Mil Jaao (Lofi Flip)", "Woh Lamhe Woh Baatein (Lofi Mix)"] },
  { season: 1, artist: "Kabhi Alvida Naa Kehna", titles: ["Tumhi Dekho Naa (Sitar Lofi)", "Kabhi Alvida Naa Kehna (Lofi Flip)", "Mitwa (Lofi Flip)"] },
  { season: 1, artist: "Fanaa", titles: ["Mere Haath Mein (LoFi Mix)", "Chand Sifarish (LoFi Mix)"] },
  { season: 1, artist: "Raaz Reboot", titles: ["Soniyo (Lofi Flip)"] },
  { season: 1, artist: "Kismat Konnection", titles: ["Bakhuda Tumhi Ho (Lofi Mix)"] },
  { season: 1, artist: "New York", titles: ["Tune Jo Na Kaha (LoFi Mix)"] },
  { season: 1, artist: "Awarapan", titles: ["Maula Mere Maula (Lofi Mix)"] },

  // ===== PART 2: Retro & Golden Era Lofi Remakes =====
  { season: 2, artist: "The Train", titles: ["Gulabi Aankhen (Lofi Flip)"] },
  { season: 2, artist: "Woh Kaun Thi?", titles: ["Lag Ja Gale (Lofi Chill Version)"] },
  { season: 2, artist: "Hum Dono", titles: ["Abhi Na Jao Chhod Kar (Lofi Flip)"] },
  { season: 2, artist: "Yaadon Ki Baarat", titles: ["Chura Liya Hai Tumne (Lofi Flip)"] },
  { season: 2, artist: "Blackmail", titles: ["Pal Pal Dil Ke Paas (Lofi Version)"] },
  { season: 2, artist: "Shor", titles: ["Ek Pyaar Ka Nagma Hai (Lofi Vibe)"] },
  { season: 2, artist: "Anand", titles: ["Kahin Door Jab Din Dhal Jaaye (Lofi Mix)"] },
  { season: 2, artist: "Manzil", titles: ["Rimjhim Gire Sawan (Lofi Flip)"] },
  { season: 2, artist: "Ghar", titles: ["Aap Ki Ankhon Mein Kuch (Lofi Version)"] },
  { season: 2, artist: "Prem Geet", titles: ["Hothon Se Chhoo Lo Tum (Lofi Flip)"] },
  { season: 2, artist: "Yaraana", titles: ["Chhookar Mere Man Ko (Lofi Flip)"] },
  { season: 2, artist: "Arth", titles: ["Tum Itna Jo Muskura Rahe Ho (Lofi Mix)"] },
  { season: 2, artist: "Silsila", titles: ["Dekha Ek Khwaab (Lofi Vibe)"] },
  { season: 2, artist: "Sharaabi", titles: ["Inteha Ho Gayi Intezaar Ki (Lofi Mix)"] },
  { season: 2, artist: "Umrao Jaan", titles: ["In Aankhon Ki Masti (Lofi Chill)", "Dil Cheez Kya Hai (Lofi Flip)"] },
  { season: 2, artist: "Kati Patang", titles: ["Pyar Deewana Hota Hai (Lofi Flip)"] },
  { season: 2, artist: "Aradhana", titles: ["Mere Sapno Ki Rani (Lofi Version)", "Roop Tera Mastana (Lofi Vibe)"] },
  { season: 2, artist: "Pakeezah", titles: ["Chalte Chalte Yun Hi Koi (Lofi Mix)"] },
  { season: 2, artist: "Yeh Vaada Raha", titles: ["Yeh Vaada Raha (Lofi Flip)", "Tu Tu Hai Wahi (Lofi Flip)"] },
  { season: 2, artist: "Satte Pe Satta", titles: ["Dilbar Mere (Lofi Flip)", "Pyaar Hamen Kis Mod Pe (Lofi Flip)"] },
  { season: 2, artist: "Deewaar", titles: ["Kehdoon Tumhen (Lofi Flip)"] },
  { season: 2, artist: "Julie", titles: ["Dil Kya Kare (Lofi Flip)"] },
  { season: 2, artist: "Lucky Ali", titles: ["O Sanam (Lofi Remix)"] },

  // ===== PART 3: Modern Hits, Indie & Chill Lofi Masterpieces =====
  { season: 3, artist: "Jab Harry Met Sejal", titles: ["Hawayein (Lofi Flip)"] },
  { season: 3, artist: "Shershaah", titles: ["Raataan Lambiyan (Lofi Flip)", "Ranjha (Lofi Flip)", "Khabii Tumhhe (Lofi Flip)"] },
  { season: 3, artist: "Love Aaj Kal", titles: ["Shayad (Lofi Flip)", "Mehrama (Lofi Flip)"] },
  { season: 3, artist: "Bhediya", titles: ["Apna Bana Le (Lofi Mix)"] },
  { season: 3, artist: "Brahmāstra", titles: ["Kesariya (Lofi Vibe)"] },
  { season: 3, artist: "Ae Dil Hai Mushkil", titles: ["Channa Mereya (Lofi Flip)", "Bulleya (Lofi Chill Mix)", "Ae Dil Hai Mushkil (Lofi Version)"] },
  { season: 3, artist: "Dilwale", titles: ["Gerua (Lofi Flip)"] },
  { season: 3, artist: "Azhar", titles: ["Bol Do Na Zara (Lofi Mix)"] },
  { season: 3, artist: "Badrinath Ki Dulhania", titles: ["Humsafar (Lofi Version)"] },
  { season: 3, artist: "Jalebi", titles: ["Pal (Lofi Flip)"] },
  { season: 3, artist: "CityLights", titles: ["Muskurane (Lofi Flip)"] },
  { season: 3, artist: "Happy New Year", titles: ["Manwa Laage (Lofi Vibe)"] },
  { season: 3, artist: "Tamasha", titles: ["Agar Tum Saath Ho (Lofi Flip)", "Matargashti (Lofi Chill Mix)"] },
  { season: 3, artist: "Ok Jaanu", titles: ["Enna Sona (Lofi Mix)", "The Humma Song (Lofi Flip)"] },
  { season: 3, artist: "Bareilly Ki Barfi", titles: ["Nazm Nazm (Lofi Flip)"] },
  { season: 3, artist: "Kedarnath", titles: ["Qaafirana (Lofi Version)", "Jaan Nisaar (Lofi Flip)"] },
  { season: 3, artist: "Jasleen Royal ft. Arijit Singh", titles: ["Heeriye (Lofi Mix)"] },
  { season: 3, artist: "Payal Dev & Stebin Ben", titles: ["Baarish Ban Jaana (LoFi Mix)"] },
  { season: 3, artist: "Asim Azhar", titles: ["Jo Tu Na Mila (Lofi Flip)"] },
  { season: 3, artist: "Arjun Kanungo", titles: ["Aaya Na Tu (Lofi Mix)", "Woh Baarishein (LoFi Mix)"] },
  { season: 3, artist: "Atif Aslam", titles: ["Paniyon Sa (Lofi Mix)", "Dil Diyan Gallan (LoFi Mix)"] },
  { season: 3, artist: "Darshan Raval", titles: ["Tera Zikr (Lofi Flip)"] },
  { season: 3, artist: "Parineeti Chopra", titles: ["Maana Ke Hum Yaar Nahin (LoFi Mix)"] },
  { season: 3, artist: "Arijit Singh", titles: ["Baatein Ye Kabhi Na (Lofi Flip)"] },
  { season: 3, artist: "Arijit Singh & Asees Kaur", titles: ["Intezaar (Lofi Flip)"] },
  { season: 3, artist: "Tulsi Kumar", titles: ["Hum Nashe Mein Toh Nahin (Lofi Revibed)"] },
  { season: 3, artist: "Stree", titles: ["Khoobsurat (LoFi Mix)"] },
  { season: 3, artist: "A.R. Rahman", titles: ["Raanjhanaa (Lofi Flip)"] },
  { season: 3, artist: "Ekk Deewana Tha", titles: ["Hosanna (Lofi Flip)"] },
  { season: 3, artist: "Bombay", titles: ["Tu Hi Re (Lofi Flip)"] },

  // Fresh Vibes Bollywood Additions
  { season: 3, artist: "Bhediya", titles: ["Apna Bana Le (Lofi Chill Version)"] },
  { season: 3, artist: "Brahmāstra", titles: ["Kesariya (Dreamy Lofi Flip)"] },
  { season: 3, artist: "Shershaah", titles: ["Raataan Lambiyan (Slowed & Reverb Lofi)", "Ranjha (Acoustic Lofi Mix)"] },
  { season: 3, artist: "Love Aaj Kal", titles: ["Shayad (Midnight Lofi Version)", "Mehrama (Lofi Chill Flip)"] },
  { season: 3, artist: "Ae Dil Hai Mushkil", titles: ["Channa Mereya (Melancholy Lofi Remix)"] },
  { season: 3, artist: "Jab Harry Met Sejal", titles: ["Hawayein (Late Night Lofi)"] },
  { season: 3, artist: "Tamasha", titles: ["Agar Tum Saath Ho (Lofi Sleep Mix)"] },

  // KR$NA Rap Lofi Additions
  { season: 3, artist: "KR$NA", titles: ["Joota Japani (Lofi Chill Flip)", "Say My Name (Slowed & Reverb Lofi)", "FALL OFF (Late Night Lofi Mix)", "I Guess (Chill Lofi Version)", "Roll Up (Smooth Lofi Flip)", "Still Here (Acoustic/Lofi Interpretation)", "What's My Name (Slowed Down Lofi Version)"] },
  { season: 3, artist: "KR$NA & Lisa Mishra", titles: ["What's Up (Lofi Vibe Mix)"] },
  { season: 3, artist: "Featuring KR$NA", titles: ["Aaya Na Tu / Kollab Lofi Remix"] },
  { season: 3, artist: "Jokhay, Umair, KR$NA", titles: ["Kaha Tak (Chill Lofi Edit)"] },

  // Additional Fresh Bollywood Lofi Hits & Chill Flips
  { season: 3, artist: "Laapataa Ladies", titles: ["Sajni (Lofi Mix)"] },
  { season: 3, artist: "Dunki", titles: ["Ve Kamleya (Lofi Flip)", "O Mahi (Lofi Version)"] },
  { season: 3, artist: "Jawan", titles: ["Chaleya (Lofi Chill Mix)", "Zinda Banda (Lofi Vibe)"] },
  { season: 3, artist: "Satyaprem Ki Katha", titles: ["Naseeb Se (Lofi Flip)", "Aaj Ke Baad (Slowed & Reverb Lofi)"] },
  { season: 3, artist: "Rocky Aur Rani Kii Prem Kahaani", titles: ["Kudmayi (Soothing Lofi Version)", "What Jhumka? (Lofi Chill Edit)"] },
  { season: 3, artist: "Kaifi Khalil", titles: ["Kahani Suno (Lofi Flip)"] },
  { season: 3, artist: "Tu Jhoothi Main Makkaar", titles: ["Maine Pi Rakhi Hai (Late Night Lofi)"] },
  { season: 3, artist: "Animal", titles: ["Pehle Bhi Main (Lofi Sleep Mix)", "Saari Duniya Jalaa Denge (Heavy Lofi Flip)", "Hua Main (Dreamy Lofi Remix)"] },
  { season: 3, artist: "AUR", titles: ["Tu Hai Kahan (Indie Lofi Mix)"] },
  { season: 3, artist: "Juss", titles: ["Suniyan Suniyan (Lofi Version)"] },
  { season: 3, artist: "Trending Sad Love Song", titles: ["Bairan (Lofi Slowed + Reverb)"] },
  { season: 3, artist: "Do Patti", titles: ["Raanjhan (Lofi Chill Flip)"] },
  { season: 3, artist: "Aditya A", titles: ["Chaand Baaliyan (Lofi Flip)"] },

  // ===== SEASON 4: BASS — Heavy Bass, Trap & Sub-Bass Lofi =====
  // Part 1: Blockbuster Modern Hits with Heavy 808s
  { season: 4, artist: "Rockstar", titles: ["Tum Ho (Heavy Bass Lofi Mix)", "Kun Faya Kun (Deep Sub-Bass Lofi Vibe)", "Nadaan Parindey (Phonk/Heavy Bass Lofi)"] },
  { season: 4, artist: "Tamasha", titles: ["Agar Tum Saath Ho (Trap Lofi Remix)", "Matargashti (Deep Bass Chill Mix)"] },
  { season: 4, artist: "Bhediya", titles: ["Apna Bana Le (Bass Boosted Lofi)"] },
  { season: 4, artist: "Shershaah", titles: ["Raataan Lambiyan (808 Bass Lofi Flip)", "Ranjha (Lofi Trap Remix)", "Khabii Tumhhe (Bass Heavy Lofi)"] },
  { season: 4, artist: "Ae Dil Hai Mushkil", titles: ["Channa Mereya (Heavy Sub-Bass Lofi)", "Bulleya (Deep Sub-Bass Lofi)", "Ae Dil Hai Mushkil (Bass Boosted Mix)"] },
  { season: 4, artist: "Brahmāstra", titles: ["Kesariya (Deep Bass Lofi Mix)"] },
  { season: 4, artist: "Love Aaj Kal", titles: ["Shayad (Heavy 808 Lofi Mix)", "Mehrama (Trap Lofi Flip)"] },
  { season: 4, artist: "Jab Harry Met Sejal", titles: ["Hawayein (Deep Bass Lofi)"] },
  { season: 4, artist: "Jasleen Royal ft. Arijit Singh", titles: ["Heeriye (Heavy Bass Lofi Flip)"] },
  { season: 4, artist: "Kedarnath", titles: ["Jaan Nisaar (Bass Heavy Lofi)", "Qaafirana (Lofi Trap Flip)"] },
  { season: 4, artist: "Dilwale", titles: ["Gerua (Trap Lofi Version)"] },
  { season: 4, artist: "Ok Jaanu", titles: ["Enna Sona (Heavy Bass Lofi Mix)", "The Humma Song (Trap Lofi Flip)"] },
  { season: 4, artist: "Bareilly Ki Barfi", titles: ["Nazm Nazm (Deep Bass Lofi)"] },
  { season: 4, artist: "Darshan Raval", titles: ["Tera Zikr (808 Bass Lofi Mix)"] },
  { season: 4, artist: "Atif Aslam", titles: ["Paniyon Sa (Trap Lofi Flip)", "Dil Diyan Gallan (Heavy Sub-Bass Lofi)"] },
  { season: 4, artist: "Asim Azhar", titles: ["Jo Tu Na Mila (Deep Bass Lofi Mix)"] },
  { season: 4, artist: "Stebin Ben & Payal Dev", titles: ["Baarish Ban Jaana (Heavy Bass Remix)"] },
  { season: 4, artist: "CityLights", titles: ["Muskurane (Trap Lofi Flip)"] },
  { season: 4, artist: "Arjun Kanungo", titles: ["Aaya Na Tu (Heavy Sub-Bass Lofi)", "Woh Baarishein (Trap Lofi Flip)"] },
  { season: 4, artist: "Parineeti Chopra", titles: ["Maana Ke Hum Yaar Nahin (Heavy Bass Mix)"] },
  { season: 4, artist: "Arijit Singh", titles: ["Baatein Ye Kabhi Na (808 Bass Lofi)"] },
  { season: 4, artist: "Tulsi Kumar", titles: ["Hum Nashe Mein Toh Nahin (Deep Bass Revibed)"] },
  { season: 4, artist: "A.R. Rahman", titles: ["Raanjhanaa (Heavy Sub-Bass Lofi Flip)"] },
  { season: 4, artist: "Ekk Deewana Tha", titles: ["Hosanna (Trap Lofi Remix)"] },
  { season: 4, artist: "Bombay", titles: ["Tu Hi Re (Heavy 808 Sub-Bass Lofi)"] },

  // Part 2: 2000s Soulful Romantics with Trap & Sub-Bass
  { season: 4, artist: "Aashiqui 2", titles: ["Tum Hi Ho (Heavy 808 Lofi Flip)"] },
  { season: 4, artist: "New York", titles: ["Tune Jo Na Kaha (Bass Heavy Lofi)"] },
  { season: 4, artist: "Race 2", titles: ["Be Intehaan (Heavy Sub-Bass Lofi)"] },
  { season: 4, artist: "Jannat", titles: ["Zara Sa (Trap Lofi Version)"] },
  { season: 4, artist: "Jannat 2", titles: ["Tujhe Sochta Hoon (Deep Bass Lofi Mix)"] },
  { season: 4, artist: "Tum Mile", titles: ["Dil Ibaadat (Sub-Bass Lofi Mix)", "Tum Mile (Heavy Bass Lofi Flip)"] },
  { season: 4, artist: "Once Upon a Time in Mumbaai", titles: ["Pee Loon (808 Lofi Mix)"] },
  { season: 4, artist: "Dum Maaro Dum", titles: ["Jiyen Kyun (Phonk/Bass Lofi Mix)"] },
  { season: 4, artist: "Kalank", titles: ["Main Tera (Lofi Bass Remix)"] },
  { season: 4, artist: "Genius", titles: ["Tera Fitoor (Bass Boosted Lofi)"] },
  { season: 4, artist: "Badlapur", titles: ["Jeena Jeena (Trap Lofi Mix)", "Judai (Heavy Sub-Bass Lofi)"] },
  { season: 4, artist: "Life in a... Metro", titles: ["In Dino (Heavy Bass Lofi Flip)", "Alvida (Deep Bass Lofi Mix)"] },
  { season: 4, artist: "Bachna Ae Haseeno", titles: ["Khuda Jaane (808 Bass Lofi Remix)"] },
  { season: 4, artist: "Jodha Akbar", titles: ["Jashn-E-Bahaara (Heavy Sub-Bass Lofi)"] },
  { season: 4, artist: "Wake Up Sid", titles: ["Iktara (Trap Lofi Flip)"] },
  { season: 4, artist: "Shor in the City", titles: ["Saibo (Deep Bass Lofi Mix)"] },
  { season: 4, artist: "Om Shanti Om", titles: ["Ajab Si (Heavy 808 Lofi Version)", "Main Agar Kahoon (Bass Boosted Mix)"] },
  { season: 4, artist: "Yeh Jawaani Hai Deewani", titles: ["Kabira (Trap Lofi Flip)", "Ilahi (Heavy Bass Chill Mix)", "Subhanallah (Sub-Bass Lofi Remix)"] },
  { season: 4, artist: "Jab We Met", titles: ["Tum Se Hi (808 Lofi Flip)", "Aaoge Jab Tum (Deep Bass Lofi Mix)"] },
  { season: 4, artist: "Haider", titles: ["Khul Kabhi Toh (Heavy Bass Lofi)", "Bismil (Trap Bass Remix)"] },
  { season: 4, artist: "Zeher", titles: ["Agar Tum Mil Jaao (Heavy 808 Lofi)", "Woh Lamhe Woh Baatein (Bass Heavy Mix)"] },
  { season: 4, artist: "Raaz Reboot", titles: ["Soniyo (Trap Lofi Flip)"] },
  { season: 4, artist: "Kismat Konnection", titles: ["Bakhuda Tumhi Ho (Deep Bass Lofi)"] },
  { season: 4, artist: "Awarapan", titles: ["Maula Mere Maula (Heavy 808 Mix)"] },
  { season: 4, artist: "Crook", titles: ["Tujhko Jo Paaya (Bass Boosted Lofi)"] },

  // Part 3: Retro & Golden Melodies with Heavy Bass
  { season: 4, artist: "The Train", titles: ["Gulabi Aankhen (808 Lofi Trap Flip)"] },
  { season: 4, artist: "Woh Kaun Thi?", titles: ["Lag Ja Gale (Deep Bass Chill Lofi)"] },
  { season: 4, artist: "Hum Dono", titles: ["Abhi Na Jao Chhod Kar (Heavy Bass Lofi)"] },
  { season: 4, artist: "Yaadon Ki Baaraat", titles: ["Chura Liya Hai Tumne (Trap Lofi Remix)"] },
  { season: 4, artist: "Blackmail", titles: ["Pal Pal Dil Ke Paas (Heavy Sub-Bass Mix)"] },
  { season: 4, artist: "Shor", titles: ["Ek Pyaar Ka Nagma Hai (808 Bass Lofi)"] },
  { season: 4, artist: "Anand", titles: ["Kahin Door Jab Din Dhal Jaaye (Deep Bass Lofi)"] },
  { season: 4, artist: "Manzil", titles: ["Rimjhim Gire Sawan (Trap Lofi Flip)"] },
  { season: 4, artist: "Ghar", titles: ["Aap Ki Ankhon Mein Kuch (Bass Heavy Lofi)"] },
  { season: 4, artist: "Prem Geet", titles: ["Hothon Se Chhoo Lo Tum (808 Bass Mix)"] },
  { season: 4, artist: "Yaraana", titles: ["Chhookar Mere Man Ko (Trap Lofi Version)"] },
  { season: 4, artist: "Arth", titles: ["Tum Itna Jo Muskura Rahe Ho (Deep Bass Lofi)"] },
  { season: 4, artist: "Silsila", titles: ["Dekha Ek Khwaab (Heavy Sub-Bass Mix)"] },
  { season: 4, artist: "Umrao Jaan", titles: ["In Aankhon Ki Masti (808 Lofi Trap Flip)", "Dil Cheez Kya Hai (Deep Bass Lofi)"] },
  { season: 4, artist: "Kati Patang", titles: ["Pyar Deewana Hota Hai (Heavy Bass Lofi)"] },
  { season: 4, artist: "Aradhana", titles: ["Mere Sapno Ki Rani (Trap Lofi Remix)", "Roop Tera Mastana (808 Bass Boosted Lofi)"] },
  { season: 4, artist: "Pakeezah", titles: ["Chalte Chalte Yun Hi Koi (Deep Bass Lofi)"] },
  { season: 4, artist: "Lucky Ali", titles: ["O Sanam (Heavy Bass Lofi Flip)"] },

  // Part 4: Intense, Dark & Melancholic Lofi Trap / Phonk
  { season: 4, artist: "Kal Ho Naa Ho", titles: ["Kal Ho Naa Ho (Heavy 808 Trap Lofi)"] },
  { season: 4, artist: "Kabhi Alvida Naa Kehna", titles: ["Kabhi Alvida Naa Kehna (Bass Heavy Mix)", "Mitwa (Trap Lofi Flip)"] },
  { season: 4, artist: "Fanaa", titles: ["Mere Haath Mein (Heavy 808 Lofi Mix)", "Chand Sifarish (Deep Bass Lofi Flip)"] },
  { season: 4, artist: "Azhar", titles: ["Bol Do Na Zara (Heavy Sub-Bass Mix)"] },
  { season: 4, artist: "Badrinath Ki Dulhania", titles: ["Humsafar (Trap Lofi Version)"] },
  { season: 4, artist: "Jalebi", titles: ["Pal (Heavy Bass Boosted Lofi)"] },
  { season: 4, artist: "Happy New Year", titles: ["Manwa Laage (808 Lofi Trap Flip)"] },
];

const favouritesList: { title: string; artist: string }[] = [
  { title: "Tum Hi Ho (Lofi Flip)", artist: "Aashiqui 2" },
  { title: "Kal Ho Naa Ho (Lofi Flip)", artist: "Kal Ho Naa Ho" },
  { title: "Kabira (Lofi Flip)", artist: "Yeh Jawaani Hai Deewani" },
  { title: "Kun Faya Kun (Lofi Vibe)", artist: "Rockstar" },
  { title: "Tum Se Hi (Lofi Flip)", artist: "Jab We Met" },
  { title: "Pehla Nasha (Lofi Chill Mix)", artist: "Jo Jeeta Wohi Sikandar" },
  { title: "Lag Ja Gale (Lofi Chill Version)", artist: "Woh Kaun Thi?" },
  { title: "In Aankhon Ki Masti (Lofi Chill)", artist: "Umrao Jaan" },
  { title: "Hawayein (Lofi Flip)", artist: "Jab Harry Met Sejal" },
  { title: "Raataan Lambiyan (Lofi Flip)", artist: "Shershaah" },
  { title: "Kesariya (Lofi Vibe)", artist: "Brahmāstra" },
  { title: "Channa Mereya (Lofi Flip)", artist: "Ae Dil Hai Mushkil" },
  { title: "Agar Tum Saath Ho (Lofi Flip)", artist: "Tamasha" },
  { title: "Shayad (Lofi Flip)", artist: "Love Aaj Kal" },
  { title: "Tera Zikr (Lofi Flip)", artist: "Darshan Raval" },
  { title: "Tu Hi Re (Lofi Flip)", artist: "Bombay" },
  { title: "Hosanna (Lofi Flip)", artist: "Ekk Deewana Tha" },
  { title: "Gulabi Aankhen (Lofi Flip)", artist: "The Train" },
  { title: "Iktara (Lofi Flip)", artist: "Wake Up Sid" },
  { title: "Nazm Nazm (Lofi Flip)", artist: "Bareilly Ki Barfi" },
];

export const getHustleCatalog = (): CatalogTrack[] => {
  const catalog: CatalogTrack[] = [];
  rawSongsData.forEach((group) => {
    group.titles.forEach((title) => {
      const id = `s${group.season}-${group.artist.toLowerCase().replace(/[^a-z0-9]/g, "")}-${title.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const compositeKey = `${title}-${group.artist}`;
      
      const coverIdx = getHash(compositeKey, coverPool.length);
      
      const isFavourite = favouritesList.some(
        (fav) =>
          fav.title.toLowerCase().trim() === title.toLowerCase().trim() &&
          fav.artist.toLowerCase().trim() === group.artist.toLowerCase().trim()
      );

      catalog.push({
        id,
        title,
        artist: group.artist,
        season: group.season,
        url: "",
        cover: coverPool[coverIdx],
        isFavourite,
      });
    });
  });
  return catalog;
};
