import { CatalogTrack } from "./catalog";

export type RetroCategory =
  | "all"
  | "Guitar"
  | "Piano"
  | "Accordion"
  | "Sax & Clarinet"
  | "Flute & Themes"
  | "favourites";

const retroCoverPool = [
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1520523839898-50712825e617?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1487180142328-0c4e37023af5?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1445985543470-41fdd6ce388d?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1482440308425-276ad0f28b19?q=80&w=400&auto=format&fit=crop",
];

const getHash = (str: string, max: number) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % max;
};

interface RawRetroTrack {
  title: string;
  artist: string;
  category: "Guitar" | "Piano" | "Accordion" | "Sax & Clarinet" | "Flute & Themes";
  isFavourite?: boolean;
}

const rawRetroData: RawRetroTrack[] = [
  // ===== 1. GUITAR (Hawaiian, Electric, Steel, Acoustic) =====
  { title: "Lag Ja Gale (Woh Kaun Thi?)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar", isFavourite: true },
  { title: "Pal Pal Dil Ke Paas (Blackmail)", artist: "Sunil Ganguly (Electric Guitar)", category: "Guitar", isFavourite: true },
  { title: "Chura Liya Hai Tumne Jo Dil Ko (Yaadon Ki Baaraat)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar", isFavourite: true },
  { title: "Yeh Shaam Mastani (Kati Patang)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar" },
  { title: "Kora Kagaz Tha Yeh Man Mera (Aradhana)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar" },
  { title: "Tere Bina Zindagi Se (Aandhi)", artist: "Sunil Ganguly (Electric Guitar)", category: "Guitar", isFavourite: true },
  { title: "Pyaar Hua Iqraar Hua (Shree 420)", artist: "Sunil Ganguly (Steel Guitar)", category: "Guitar" },
  { title: "Chaudhvin Ka Chand Ho (Chaudhvin Ka Chand)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar" },
  { title: "Abhi Na Jao Chhod Kar (Hum Dono)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar", isFavourite: true },
  { title: "Aap Ki Ankhon Mein Kuch (Ghar)", artist: "Sunil Ganguly (Electric Guitar)", category: "Guitar" },
  { title: "O Mere Dil Ke Chain (Mere Jeevan Saathi)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar", isFavourite: true },
  { title: "Gulabi Aankhen (The Train)", artist: "Sunil Ganguly (Electric Guitar)", category: "Guitar", isFavourite: true },
  { title: "Ajeeb Dastan Hai Yeh (Dil Apna Aur Preet Parai)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar" },
  { title: "Kabhi Kabhie Mere Dil Mein (Kabhi Kabhie)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar", isFavourite: true },
  { title: "Kahin Door Jab Din Dhal Jaaye (Anand)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar" },
  { title: "Maine Tere Liye Hi Saat Rang Ke (Anand)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar" },
  { title: "Rimjhim Gire Sawan (Manzil)", artist: "Sunil Ganguly (Electric Guitar)", category: "Guitar", isFavourite: true },
  { title: "Chingari Koi Bhadke (Amar Prem)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar" },
  { title: "Kuch Toh Log Kahenge (Amar Prem)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar" },
  { title: "Tum Aa Gaye Ho Noor Aa Gaya (Aandhi)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar" },
  { title: "Baharon Phool Barsao (Suraj)", artist: "Kazi Aniruddha (Acoustic Guitar)", category: "Guitar" },
  { title: "Likhe Jo Khat Tujhe (Kanyadaan)", artist: "Kazi Aniruddha (Hawaiian Guitar)", category: "Guitar", isFavourite: true },
  { title: "Deewana Hua Badal (Kashmir Ki Kali)", artist: "Kazi Aniruddha (Hawaiian Guitar)", category: "Guitar" },
  { title: "Raat Kali Ek Khwab Mein Aayi (Buddha Mil Gaya)", artist: "Sunil Ganguly (Hawaiian Guitar)", category: "Guitar", isFavourite: true },
  { title: "Dil Kya Kare Jab Kisi Ko (Julie)", artist: "Sunil Ganguly (Electric Guitar)", category: "Guitar" },

  // ===== 2. PIANO (Grand Piano, Piano Solo) =====
  { title: "Lag Ja Gale (Woh Kaun Thi?)", artist: "Brian Silas (Grand Piano)", category: "Piano", isFavourite: true },
  { title: "Ajeeb Dastan Hai Yeh (Dil Apna Aur Preet Parai)", artist: "Brian Silas (Piano Solo)", category: "Piano" },
  { title: "Chaudhvin Ka Chand Ho (Chaudhvin Ka Chand)", artist: "Brian Silas (Piano)", category: "Piano" },
  { title: "Tere Bina Zindagi Se (Aandhi)", artist: "Brian Silas (Grand Piano)", category: "Piano", isFavourite: true },
  { title: "Kabhi Kabhie Mere Dil Mein (Kabhi Kabhie)", artist: "Brian Silas (Piano Solo)", category: "Piano", isFavourite: true },
  { title: "Kahin Door Jab Din Dhal Jaaye (Anand)", artist: "Brian Silas (Grand Piano)", category: "Piano" },
  { title: "Pal Pal Dil Ke Paas (Blackmail)", artist: "Brian Silas (Piano)", category: "Piano", isFavourite: true },
  { title: "Yeh Shaam Mastani (Kati Patang)", artist: "Brian Silas (Grand Piano)", category: "Piano" },
  { title: "Waqt Ne Kiya Kya Haseen Sitam (Kaagaz Ke Phool)", artist: "Brian Silas (Piano Solo)", category: "Piano", isFavourite: true },
  { title: "Jane Woh Kaise Log The (Pyaasa)", artist: "Brian Silas (Grand Piano)", category: "Piano" },
  { title: "Chupke Chupke Raat Din (Nikaah)", artist: "Brian Silas (Piano)", category: "Piano" },
  { title: "Tere Mere Milan Ki Yeh Raina (Abhimaan)", artist: "Brian Silas (Piano Solo)", category: "Piano" },
  { title: "Meet Na Mila Re Man Ka (Abhimaan)", artist: "Brian Silas (Piano)", category: "Piano" },
  { title: "Tere Mere Sapne Ab Ek Rang Hain (Guide)", artist: "Brian Silas (Grand Piano)", category: "Piano", isFavourite: true },
  { title: "Gaata Rahe Mera Dil (Guide)", artist: "Brian Silas (Piano)", category: "Piano" },
  { title: "Din Dhal Jaaye Haye (Guide)", artist: "Brian Silas (Grand Piano)", category: "Piano" },
  { title: "Aapki Nazron Ne Samjha (Anpadh)", artist: "Brian Silas (Piano Solo)", category: "Piano" },
  { title: "Yeh Samaa Samaa Hai Pyar Ka (Jab Jab Phool Khile)", artist: "Brian Silas (Piano)", category: "Piano" },
  { title: "Humne Dekhi Hai Un Aankhon Ki (Khamoshi)", artist: "Brian Silas (Grand Piano)", category: "Piano" },
  { title: "Woh Sham Kuch Ajeeb Thi (Khamoshi)", artist: "Brian Silas (Piano Solo)", category: "Piano", isFavourite: true },

  // ===== 3. ACCORDION (Accordion, Organ & Synth) =====
  { title: "Pyaar Hua Iqraar Hua (Shree 420)", artist: "Enoch Daniels (Accordion)", category: "Accordion", isFavourite: true },
  { title: "Dil Pukare Aare Aare (Jewel Thief)", artist: "Enoch Daniels (Accordion & Organ)", category: "Accordion" },
  { title: "Chala Jata Hoon (Mere Jeevan Saathi)", artist: "Enoch Daniels (Accordion)", category: "Accordion", isFavourite: true },
  { title: "Ek Ladki Bheegi Bhaagi Si (Chalti Ka Naam Gaadi)", artist: "Enoch Daniels (Accordion)", category: "Accordion", isFavourite: true },
  { title: "Hai Apna Dil To Aawara (Solva Saal)", artist: "Enoch Daniels (Accordion Solo)", category: "Accordion" },
  { title: "Aao Na Gale Lagao Na (Mere Jeevan Saathi)", artist: "Enoch Daniels (Organ & Accordion)", category: "Accordion" },
  { title: "Yeh Dil Na Hota Bechara (Jewel Thief)", artist: "Enoch Daniels (Accordion)", category: "Accordion" },
  { title: "Meri Bheegi Bheegi Si (Anamika)", artist: "Enoch Daniels (Accordion)", category: "Accordion", isFavourite: true },
  { title: "Bahon Mein Chale Aao (Anamika)", artist: "Enoch Daniels (Accordion)", category: "Accordion" },
  { title: "Roop Tera Mastana (Aradhana)", artist: "Enoch Daniels (Accordion)", category: "Accordion", isFavourite: true },
  { title: "Mere Sapno Ki Rani (Aradhana)", artist: "Enoch Daniels (Accordion)", category: "Accordion", isFavourite: true },
  { title: "Kya Khoob Lagti Ho (Dharmatma)", artist: "Enoch Daniels (Accordion & Synth)", category: "Accordion" },
  { title: "Karvaten Badalte Rahe (Aap Ki Kasam)", artist: "Enoch Daniels (Accordion)", category: "Accordion" },
  { title: "Jai Jai Shiv Shankar (Aap Ki Kasam)", artist: "Enoch Daniels (Accordion)", category: "Accordion" },
  { title: "Aanewala Pal Jaanewala Hai (Gol Maal)", artist: "Enoch Daniels (Accordion)", category: "Accordion", isFavourite: true },
  { title: "Hum Tum Ek Kamre Mein Band Hon (Bobby)", artist: "Goody Servai (Accordion)", category: "Accordion", isFavourite: true },
  { title: "Main Shayar To Nahin (Bobby)", artist: "Goody Servai (Accordion & Organ)", category: "Accordion" },
  { title: "Jhooth Bole Kauwa Kaate (Bobby)", artist: "Goody Servai (Accordion)", category: "Accordion" },
  { title: "Ankhiyon Ke Jharokhon Se (Ankhiyon Ke Jharokhon Se)", artist: "Enoch Daniels (Accordion)", category: "Accordion" },
  { title: "Suhaana Safar Aur Yeh Mausam (Madhumati)", artist: "Goody Servai (Accordion)", category: "Accordion", isFavourite: true },

  // ===== 4. SAXOPHONE & CLARINET =====
  { title: "Chura Liya Hai Tumne Jo Dil Ko (Yaadon Ki Baaraat)", artist: "Manohari Singh (Alto Sax)", category: "Sax & Clarinet", isFavourite: true },
  { title: "Hothon Mein Aisi Baat (Jewel Thief)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet" },
  { title: "Dum Maro Dum (Hare Rama Hare Krishna)", artist: "Manohari Singh (Alto Sax)", category: "Sax & Clarinet", isFavourite: true },
  { title: "Phoolon Ka Taron Ka (Hare Rama Hare Krishna)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet" },
  { title: "Bheegi Bheegi Raaton Mein (Ajnabee)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet", isFavourite: true },
  { title: "Ek Ajnabee Haseena Se (Ajanabee)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet" },
  { title: "Piya Tose Naina Laage Re (Guide)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet" },
  { title: "Panna Ki Tamanna Hai (Heera Panna)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet" },
  { title: "Saamne Yeh Kaun Aaya (Jawani Diwani)", artist: "Manohari Singh (Alto Sax)", category: "Sax & Clarinet", isFavourite: true },
  { title: "Jaane Jaan Dhoondta Phir Raha (Jawani Diwani)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet" },
  { title: "O Saathi Re Tere Bina (Muqaddar Ka Sikandar)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet", isFavourite: true },
  { title: "Salaam-e-Ishq Meri Jaan (Muqaddar Ka Sikandar)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet" },
  { title: "Dil To Hai Dil (Muqaddar Ka Sikandar)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet" },
  { title: "Tareef Karun Kya Uski (Kashmir Ki Kali)", artist: "Master Ebrahim (Clarinet)", category: "Sax & Clarinet", isFavourite: true },
  { title: "Isharon Isharon Mein Dil Lenewale (Kashmir Ki Kali)", artist: "Master Ebrahim (Clarinet)", category: "Sax & Clarinet" },
  { title: "Aaja Re Pardesi (Madhumati)", artist: "Master Ebrahim (Clarinet)", category: "Sax & Clarinet" },
  { title: "Dil Tadap Tadap Ke Kah Raha (Madhumati)", artist: "Master Ebrahim (Clarinet)", category: "Sax & Clarinet" },
  { title: "Akele Akele Kahan Ja Rahe Ho (An Evening in Paris)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet" },
  { title: "Raat Ke Humsafar (An Evening in Paris)", artist: "Manohari Singh (Saxophone)", category: "Sax & Clarinet" },
  { title: "Na Tum Humen Jano (Baat Ek Raat Ki)", artist: "Master Ebrahim (Clarinet)", category: "Sax & Clarinet", isFavourite: true },

  // ===== 5. BANSURI, SITAR & CLASSIC THEMES =====
  { title: "Lag Ja Gale (Woh Kaun Thi?)", artist: "Pandit Ronu Majumdar (Bansuri)", category: "Flute & Themes", isFavourite: true },
  { title: "Tere Bina Zindagi Se (Aandhi)", artist: "Rakesh Chaurasia (Flute)", category: "Flute & Themes", isFavourite: true },
  { title: "Chalte Chalte Yunhi Koi (Pakeezah)", artist: "Pandit Ronu Majumdar (Bansuri)", category: "Flute & Themes" },
  { title: "Inhi Logon Ne (Pakeezah)", artist: "Rakesh Chaurasia (Flute)", category: "Flute & Themes" },
  { title: "Beeti Na Bitai Raina (Parichay)", artist: "Pandit Ronu Majumdar (Bansuri)", category: "Flute & Themes" },
  { title: "Musafir Hoon Yaaron (Parichay)", artist: "Rakesh Chaurasia (Flute)", category: "Flute & Themes", isFavourite: true },
  { title: "Teri Bindiya Re (Abhimaan)", artist: "Pandit Ronu Majumdar (Bansuri)", category: "Flute & Themes" },
  { title: "Piya Bina Piya Bina (Abhimaan)", artist: "Rakesh Chaurasia (Flute)", category: "Flute & Themes" },
  { title: "Tum Jo Mil Gaye Ho (Hanste Zakhm)", artist: "Pandit Ronu Majumdar (Bansuri)", category: "Flute & Themes" },
  { title: "Teri Aankhon Ke Siva (Chirag)", artist: "Rakesh Chaurasia (Flute)", category: "Flute & Themes" },
  { title: "Ek Pyar Ka Nagma Hai (Shor)", artist: "Pandit Ronu Majumdar (Bansuri)", category: "Flute & Themes", isFavourite: true },
  { title: "Theme of Sholay (Instrumental Harmony)", artist: "Sholay OST (R. D. Burman)", category: "Flute & Themes", isFavourite: true },
  { title: "Title Music (Sitar & Flute Instrumental)", artist: "Pather Panchali (Pandit Ravi Shankar)", category: "Flute & Themes" },
  { title: "Love Theme / Background Flute", artist: "Bobby OST (Laxmikant-Pyarelal)", category: "Flute & Themes", isFavourite: true },
  { title: "The Great Gambler Instrumental Theme", artist: "The Great Gambler OST (R. D. Burman)", category: "Flute & Themes" },
];

export const getRetroInstrumentalCatalog = (): CatalogTrack[] => {
  return rawRetroData.map((item, index) => {
    const cleanTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanArtist = item.artist.toLowerCase().replace(/[^a-z0-9]/g, "");
    const id = `retro-${index + 1}-${cleanArtist.slice(0, 10)}-${cleanTitle.slice(0, 15)}`;
    const compositeKey = `${item.title}-${item.artist}`;
    const coverIdx = getHash(compositeKey, retroCoverPool.length);

    return {
      id,
      title: item.title,
      artist: item.artist,
      season: 1950,
      url: "",
      cover: retroCoverPool[coverIdx],
      isFavourite: item.isFavourite,
      category: item.category,
    };
  });
};