// This file contains default Bodh Gaya heritage data to be seeded into the database
// Run this after connecting to MongoDB

const heritageData = [
    {
        title: "Mahabodhi Temple",
        category: "temple",
        shortDescription: "The ancient temple where Buddha attained enlightenment, a UNESCO World Heritage Site and one of the oldest brick structures in India.",
        fullDescription: "The Mahabodhi Temple is the most sacred temple in Bodh Gaya and stands as a testament to the spiritual significance of this place. Built in the 5th-6th century, it marks the exact location where Siddhartha Gautama achieved enlightenment under the Bodhi Tree. The temple's architecture is a masterpiece of ancient Indian design with intricate carvings and sculptures depicting various scenes from Buddha's life.",
        significance: "This is the holiest pilgrimage site for Buddhists worldwide. The temple represents the culmination of Buddha's spiritual journey and serves as a beacon for millions of devotees seeking spiritual awakening.",
        historicalFacts: [
            "Built around 500 CE during the reign of King Ashoka",
            "The temple stands about 52 meters (170 feet) tall",
            "It is one of the oldest brick temples in the world",
            "UNESCO declared it a World Heritage Site in 2002",
            "The temple has been renovated and preserved multiple times through history"
        ],
        location: {
            lat: 24.695,
            lng: 84.991,
            address: "Bodhi Marg, Bodh Gaya, Bihar 824231"
        },
        imageUrl: "https://images.unsplash.com/photo-1569163139394-de4798aa62b1?w=800",
        images: [
            "https://images.unsplash.com/photo-1569163139394-de4798aa62b1?w=800",
            "https://images.unsplash.com/photo-1544367567-0d75bcac6d60?w=800"
        ],
        bestTimeToVisit: "October to March (winter months provide pleasant weather)",
        visitingHours: "5:00 AM - 9:00 PM daily",
        entryFee: "Free (Donations welcome)",
        estimatedVisitTime: "2-3 hours",
        relatedTemples: ["Bodh Gaya Temple", "Chinese Temple", "Japanese Temple"],
        spiritualSignificance: "The site of Buddha's enlightenment and the most important Buddhist pilgrimage destination"
    },
    {
        title: "Bodhi Tree",
        category: "monument",
        shortDescription: "The sacred fig tree under which Buddha attained enlightenment 2,600 years ago, believed to be over 2,500 years old.",
        fullDescription: "The Bodhi Tree, also known as the Tree of Enlightenment, stands in the compound of the Mahabodhi Temple. This sacred fig tree (Ficus religiosa) is one of the most revered natural monuments in the world. According to Buddhist tradition, Prince Siddhartha sat beneath this tree and meditated for 49 days, during which he attained enlightenment and became the Buddha. The tree has become a symbol of spiritual awakening and inner peace.",
        significance: "The Bodhi Tree represents the path to spiritual awakening and is deeply sacred to billions of Buddhists around the world.",
        historicalFacts: [
            "The original tree was planted about 2,500 years ago",
            "The tree has been replanted several times due to damage",
            "The current tree is said to be a descendant of the original",
            "Buddhist monks from around the world have planted saplings from this tree in their countries",
            "The tree can live for over 3,000 years"
        ],
        location: {
            lat: 24.695,
            lng: 84.991,
            address: "Inside Mahabodhi Temple complex, Bodh Gaya"
        },
        imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",
        bestTimeToVisit: "October to March",
        visitingHours: "5:00 AM - 9:00 PM",
        entryFee: "Free",
        estimatedVisitTime: "1-2 hours",
        spiritualSignificance: "The exact spot of Buddha's enlightenment and enlightenment itself"
    },
    {
        title: "Bodh Gaya Archaeological Museum",
        category: "history",
        shortDescription: "A museum displaying ancient artifacts, sculptures, and inscriptions related to Buddhist history and Bodh Gaya's past.",
        fullDescription: "The Bodh Gaya Archaeological Museum showcases the rich cultural heritage and history of Bodh Gaya. The museum houses an impressive collection of sculptures, stone carvings, and artifacts from various periods of history. These artifacts provide insights into the evolution of Buddhist art and culture, as well as the social and religious life of ancient India.",
        significance: "The museum preserves and displays the tangible heritage of Buddhism and serves as an educational center for visitors from around the world.",
        historicalFacts: [
            "The museum was established to preserve artifacts found during excavations",
            "It contains sculptures and artifacts dating back over 2,000 years",
            "Many pieces are masterpieces of ancient Indian sculpture",
            "The museum provides crucial insights into the development of Buddhist art"
        ],
        location: {
            address: "Near Mahabodhi Temple, Bodh Gaya"
        },
        imageUrl: "https://images.unsplash.com/photo-1578926078328-123456789000?w=800",
        bestTimeToVisit: "October to March",
        visitingHours: "10:00 AM - 5:00 PM (Closed on Mondays and Fridays)",
        entryFee: "₹100 for Indian visitors, ₹250 for foreign visitors",
        estimatedVisitTime: "2-3 hours",
        spiritualSignificance: "Understanding the historical and cultural roots of Buddhism"
    },
    {
        title: "Great Buddha Statue",
        category: "monument",
        shortDescription: "A magnificent 25-meter tall statue of Buddha, overlooking Bodh Gaya and serving as a symbol of peace and compassion.",
        fullDescription: "The Great Buddha Statue stands as a modern monument to Buddha's teachings of peace and compassion. This impressive statue overlooks the plains of Bodh Gaya and has become an iconic landmark. Visitors can see the serene expression on Buddha's face and feel the spiritual energy emanating from this sacred monument.",
        significance: "The statue represents Buddha's teachings of peace, non-violence, and compassion for all beings.",
        location: {
            address: "Bodh Gaya, Bihar"
        },
        imageUrl: "https://images.unsplash.com/photo-1584734259123-456789012345?w=800",
        bestTimeToVisit: "October to March",
        visitingHours: "6:00 AM - 6:00 PM",
        entryFee: "₹50",
        estimatedVisitTime: "1-2 hours",
        spiritualSignificance: "Meditation on Buddha's teachings of universal compassion"
    },
    {
        title: "Chinese Temple",
        category: "temple",
        shortDescription: "A beautiful Chinese Buddhist temple showcasing unique architectural style and hosting pilgrims from East Asia.",
        fullDescription: "The Chinese Temple is one of the several international Buddhist temples in Bodh Gaya, built by Chinese Buddhists. It features traditional Chinese architectural elements and ornate decorations. The temple serves as a gathering place for Chinese and East Asian pilgrims and is an important center for Buddhist practice and study.",
        significance: "The temple represents the global reach of Buddhism and provides a space for East Asian Buddhist communities to practice their faith.",
        location: {
            address: "Near Mahabodhi Temple, Bodh Gaya"
        },
        imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800",
        bestTimeToVisit: "October to March",
        visitingHours: "6:00 AM - 8:00 PM",
        entryFee: "Free",
        estimatedVisitTime: "1-2 hours",
        spiritualSignificance: "Eastern Buddhist traditions and practices"
    },
    {
        title: "Bodh Gaya Festival",
        category: "festival",
        shortDescription: "Annual celebration commemorating Buddha's birth, enlightenment, and death with prayers, processions, and cultural events.",
        fullDescription: "The Bodh Gaya Festival, also known as Buddha Jayanti or Vesak, is celebrated every year on the full moon day of May. It commemorates Buddha's birth, enlightenment, and death (which, according to Buddhist tradition, all occurred on the same day of the lunar calendar). The festival is a grand celebration with thousands of pilgrims gathering to participate in prayers, processions, and meditation sessions.",
        significance: "The festival brings together Buddhists from around the world to celebrate their shared faith and spiritual heritage.",
        historicalFacts: [
            "Celebrated on the full moon day of the Indian month of Vaisakh (April-May)",
            "Also known as Buddha Purnima or Vesak",
            "Thousands of pilgrims participate in the celebrations",
            "The day includes religious ceremonies, prayers, and acts of charity"
        ],
        bestTimeToVisit: "April-May during the festival",
        estimatedVisitTime: "Full day event",
        spiritualSignificance: "Celebrating the birthday and teachings of the Buddha"
    },
    {
        title: "Meditation and Mindfulness",
        category: "tradition",
        shortDescription: "The ancient Buddhist tradition of meditation, central to spiritual practice at Bodh Gaya, where seekers find inner peace.",
        fullDescription: "Meditation is at the heart of Buddhist practice and spirituality. In Bodh Gaya, visitors and pilgrims engage in meditation practices, including Vipassana (insight meditation) and Samadhi (concentration meditation). These practices, which Buddha himself taught, help practitioners cultivate mental clarity, emotional balance, and spiritual insight.",
        significance: "Meditation is the path to enlightenment and inner peace as taught by Buddha 2,600 years ago.",
        historicalFacts: [
            "Buddha's primary teaching method was through meditation and mindfulness",
            "The Eightfold Path emphasizes right mindfulness and meditation",
            "Thousands of meditation centers and monasteries exist in Bodh Gaya",
            "Modern neuroscience has confirmed the benefits of meditation for mental health"
        ],
        estimatedVisitTime: "Variable (from 30 minutes to several days)",
        spiritualSignificance: "The direct path to enlightenment and awakening"
    }
];

// To use this data, copy and run in MongoDB directly or via a migration script:
/*
const BodhiPath = require('./models/BodhiPath');

async function seedData() {
    try {
        await BodhiPath.deleteMany({});
        await BodhiPath.insertMany(heritageData);
        console.log('Heritage data seeded successfully!');
    } catch (error) {
        console.error('Error seeding data:', error);
    }
}

seedData();
*/

module.exports = heritageData;
