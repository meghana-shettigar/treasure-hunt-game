// Game Data - Letter Left Behind Treasure Hunt in London

const gameData = {
    startingLocation: {
        name: "Waterloo Station",
        address: "Waterloo Station, London SE1 8SW",
        coordinates: {
            lat: 51.4952,
            lng: -0.1441
        }
    },
    
    locations: [
        {
            id: 1,
            clue: "I hang up high where journeys begin, I have two hands but never wave.\nTrains rush past, but I stay still, helping travellers know when to leave.\n\nWhat am I?\n\n Ans: The Waterloo ___",
            name: "Location 1: Waterloo Clock",
            locationName: "Clock",
            locationNameVariations: ["waterloo clock", "clock", "the waterloo clock"],
            mapHint: "https://www.google.com/maps/embed?pb=!4v1769363363916!6m8!1m7!1sRMzv-N5FVCOLpPAxGn0opg!2m2!1d51.50322710450521!2d-0.1123464712873058!3f298.3047576250058!4f3.665911227972913!5f0.7820865974627469",
            question: "Stand where travellers first step inside the station, which is visible if you stand below the Waterloo Clock,\nA mural to celebrate 200 years of rail travel greets you right at the beginning of the journey. \nA child is shown travelling through time,\n\nFrom which place did the child begin their journey?",            
            correctAnswer: "Horsley",
            textHint: "A place name derived from- place of horses",
            titbits: "Waterloo Station is one of London's busiest railway stations, opened in 1848. The station's clock has been a landmark for travellers for over 170 years. The station was named after the Battle of Waterloo and has been featured in numerous films and literature. The mural celebrating 200 years of rail travel depicts scenes from railway history, including a child travelling through time."
        },
        {
            id: 2,
            clue: "Travel to the upper level where clock meets your eyes.\nFrom here, look carefully around that level,\nYou will see a couple made of pericrete, frozen in time on a wall.\n\nHere how many people are peeking over the wall?",
            name: "Location 2: Six People",
            locationName: "Six",
            locationNameVariations: ["six", "6"],
            mapHint: null, // No map hint - use text hint for clue instead
            question: "Facing the couple, turn left and walk beside the stone story. Time has been stamped below a shining medal.\n\nIn which year was this memory placed to honour those lost in battle of Waterloo?",
            correctAnswer: "2015",
            textHint: "History whispers softly.\nLook closely beneath the medal — the year is hiding there.",
            titbits: "Waterloo Station features several memorials and artworks. The Waterloo Memorial commemorates those who lost their lives in the Battle of Waterloo. The station area contains various sculptures and installations that tell stories of history and travel. The memorial was placed in 2015 to mark the 200th anniversary of the Battle of Waterloo."
        },
        {
            id: 3,
            clue: "Return to the level of clock and walk 240 degrees.\nThere, a family of three travellers pauses —\nstanding on what they carried, after crossing sea and time.\nThis monument remembers their long journey and arrival.\n\nWhat is the name of this monument?",
            name: "Location 3: National Windrush Monument",
            locationName: "National Windrush Monument",
            locationNameVariations: ["national windrush monument", "windrush monument", "the national windrush monument"],
            mapHint: "https://www.google.com/maps/embed?pb=!4v1769364859609!6m8!1m7!1sZjow5IlHDiP7SkQTd3jDDg!2m2!1d51.50357457017828!2d-0.1136926050152614!3f138.60393716989074!4f-4.140001621524604!5f0.7820865974627469",
            question: "These travellers stand on symbols of travel and hope.\n\nHow many bundles lift them from the ground?",
            correctAnswer: "Seven",
            textHint: "Count the colours that paint the sky after rain 🌈",
            titbits: "The National Windrush Monument commemorates the arrival of the HMT Empire Windrush in 1948, which brought hundreds of Caribbean migrants to Britain. The monument, unveiled in 2022, features three figures representing the Windrush generation. It stands as a symbol of the contributions made by Caribbean communities to British society. The monument is located near Waterloo Station, a significant arrival point for many immigrants."
        },
        {
            id: 4,
            clue: "Time has scrambled the letters into numbers.\n\n19 – 20 – 1 – 20 – 9 – 15 – 14\n13 – 1 – 9 – 14\n5 – 14 – 20 – 18 – 1 – 14 – 3 – 5\n\nIs where should you go next..",
            name: "Location 4: Station Main Entrance",
            locationName: "Station Main Entrance",
            locationNameVariations: ["station main entrance", "main entrance", "the station main entrance"],
            mapHint: "https://www.google.com/maps/embed?pb=!4v1769366295551!6m8!1m7!1sxe67uJO7W6owtu7z-UGvUA!2m2!1d51.50386113822189!2d-0.1138200265378699!3f177.50941301104305!4f26.691932314604855!5f0.7820865974627469",
            question: "After finding the nearest exit from where you are stand, go to the station Main Entrance.\n Stepping outside, facing the entrance, a word hides between two ancient lands.\n\nWhat place sits between France and Egypt?",
            correctAnswer: "Mesopotamia",
            textHint: "My name means \"land between two rivers\", spoken long ago in Greek.",
            titbits: "Waterloo Station's main entrance is a grand Victorian structure that has welcomed millions of travellers. The station was designed by architects and opened in 1848. The entrance area contains various historical references and architectural details. Mesopotamia, meaning 'land between two rivers' in Greek, refers to the ancient region between the Tigris and Euphrates rivers, located between modern-day France (via historical connections) and Egypt."
        },
        {
            id: 5,
            clue: "Follow the directions your map has traced, to reach the location and find your place. \nAt this location which Hall do you see?",
            clueImage: "images/location5-clue.png", // Map image shown with the clue
            name: "Location 5: Royal Festival Hall",
            locationName: "Royal Festival Hall",
            locationNameVariations: ["royal festival hall", "royal festival", "the royal festival hall"],
            mapHint: "https://www.google.com/maps/embed?pb=!4v1769366465013!6m8!1m7!1sBteM4qvg_0fxUhRmGbd_PA!2m2!1d51.50535665515403!2d-0.1167138988201796!3f307.7831709459798!4f-8.58211714459695!5f0.7820865974627469",
            question: "Before crossing time's river, a man stands tall who once was locked away.\n\nWho is the traveller who returned from prison to lead a nation?",
            correctAnswer: "Nelson Mandela",
            textHint: "I fought against apartheid \nand became South Africa’s first president.",
            titbits: "The Golden Jubilee Bridges are two pedestrian bridges crossing the River Thames, opened in 2002 to celebrate Queen Elizabeth II's Golden Jubilee. The bridges connect the South Bank to the Embankment area. Nearby stands a statue of Nelson Mandela, the anti-apartheid leader who became South Africa's first black president. The bridges offer stunning views of the London Eye and the Houses of Parliament."
        },
        {
            id: 6,
            clue: "Time has left many names beside the river. On the bridge, find the plaque that maps them all.\nRead from left to right, as time always moves.\n\nThe third name from the left, tells you where to go.",
            name: "Location 6: Victoria Embankment Garden",
            locationName: "Victoria Embankment Garden",
            locationNameVariations: ["victoria embankment garden", "embankment garden", "the victoria embankment garden"],
            mapHint: "https://www.google.com/maps/embed?pb=!4v1769366908680!6m8!1m7!1syTWsojP8bqmJPwH9mRWzHA!2m2!1d51.50795851300809!2d-0.1224441565759356!3f36.04525018162211!4f-3.4591971974855227!5f0.7820865974627469",
            question: "A Poetic Genius once sent something forward through time, not with his hands, but with his words.\n\nWhat did Poetic Genius throw?",
            correctAnswer: "Inspiring Mantle",
            textHint: "\"I am Robert Burns.\" Think of warmth, honour, and responsibility.",
            titbits: "Victoria Embankment Gardens is a beautiful public park along the Thames, created in the 1870s. The gardens contain several memorials and statues, including one of Scottish poet Robert Burns. The area is named after Queen Victoria and was part of the embankment project that reclaimed land from the river. The gardens offer a peaceful retreat in the heart of London with views of the Thames."
        },
        {
            id: 7,
            clue: "Time remembers those who never returned. Before travelling onward, on the memorial next to where you stand, honour the names of those who fell in action or died of wounds and disease.\n Collect letters exactly as follows for the Australian contingent:\n\n• First and second letter of the 6th name in the second column\n• First and second letter of the 6th name in the first column\n• Sixth, seventh and eighth letter of the 5th name in the second column\n• Add a space, then add an x\n\nWhere does this spell take you?",
            name: "Location 7: Charing Cross",
            locationName: "Charing Cross",
            locationNameVariations: ["charing cross", "charing cross station"],
            mapHint: "https://www.google.com/maps/embed?pb=!4v1769367027321!6m8!1m7!1sId4LfNc-3trt1Wc7Vdx_jQ!2m2!1d51.50834084218947!2d-0.1252416772588233!3f112.63376447467523!4f7.541047533510721!5f0.7820865974627469",
            question: "I rise through time in stages three, built from Portland stone, Mansfield stone, and Aberdeen granite.\nI stand tall crowned with a spire and a cross.\nJourneys are measured from where I stand.\n\nWhat landmark am I?",
            correctAnswer: "Queen Eleanor Memorial Cross",
            textHint: "I am an octagonal Gothic tower, standing where journeys are measured.",
            titbits: "Charing Cross is a major road junction and railway station in central London. The name originates from the Eleanor Cross, one of twelve crosses erected by King Edward I to mark the resting places of his wife Queen Eleanor's funeral procession. The current cross is a Victorian replica. Charing Cross is considered the centre of London, with distances to other places measured from this point. The area contains memorials to those who served in various conflicts."
        },
        {
            id: 8,
            clue: "Lions guard me night and day, while time gathers in open space.\nBattles named me long ago, and travellers meet beneath tall stone.\nHistory watches from every side.\n\nWhere should you be standing?",
            name: "Location 8: Trafalgar Square",
            locationName: "Trafalgar Square",
            locationNameVariations: ["trafalgar square", "the trafalgar square"],
            mapHint: "https://www.google.com/maps/embed?pb=!4v1769367121331!6m8!1m7!1sVqMMJRBO8_ICJDFtoxff2g!2m2!1d51.50771717045196!2d-0.1275985731589382!3f348.6476903361844!4f-1.5751135114300183!5f0.7820865974627469",
            question: "On the left side of Beatty, beneath old rules of measure and scale, a number marks when length feels just right.\n\nAt what temperature was the standard set?",
            correctAnswer: "62",
            textHint: "Look below the imperial standards of length.",
            titbits: "Trafalgar Square is one of London's most famous public spaces, named after the Battle of Trafalgar. The square is dominated by Nelson's Column, surrounded by four bronze lions. The square was designed by architect John Nash and completed in the 1840s. It has been a site for political demonstrations, celebrations, and public gatherings. The square contains various monuments and fountains, and is a major tourist attraction."
        },
        {
            id: 9,
            clue: "High on a horse, frozen in time, I watch the square from EVERY side. Kings may fall, but statues stay —\n\nWho am I?",
            name: "Location 9: King Charles I",
            locationName: "King Charles I",
            locationNameVariations: ["king charles i", "king charles", "charles i", "statue of king charles i"],
            mapHint: "https://www.google.com/maps/embed?pb=!4v1769370543722!6m8!1m7!1soPheZ1GvHp0Kor-97p5qWw!2m2!1d51.50722965825501!2d-0.1276621886261673!3f355.37288315890896!4f0!5f0.7820865974627469",
            question: "Before this rider claimed the spot, another memory stood here first.\n\nWhat did the king replace? Queen Eleanor's ______",
            correctAnswer: "Cross",
            textHint: "Look down — history rests beneath your feet.",
            titbits: "The equestrian statue of King Charles I stands at the southern end of Trafalgar Square, facing down Whitehall. It was created by French sculptor Hubert Le Sueur in 1633 and is one of London's oldest outdoor statues. The statue marks the site where the original Charing Cross (Queen Eleanor's Cross) once stood. King Charles I was executed in 1649 during the English Civil War, making this statue historically significant."
        },
        {
            id: 10,
            clue: "🕰️ You’ve reached the moment where time slows down.\nFind a quiet place — this message was never meant to be rushed.\nTo uncover what was left behind, follow the traveller’s method exactly.\nEvery answer you discovered exists at a different moment in time.\n\nFrom each named Location or Answer you found, take the first letter.\nThen move forward by the number shown next to it, to arrive at the correct letter for the final message.\n\nActual Clue — \n(Do not change the order)\n• Location 4 (+1), Answer 1 (+1), Answer 4 (0), Location 7 (+2)\n\n• Location 4 (+1), Location 8 (+1), Answer 7 (+1), Answer 4 (+1), Location 4 (0)\n\n• Answer 4 (+1), Location 3 (+1), Location 6 (+1)",
            name: "Location 10: The Final Destination",
            locationName: "The Final Destination",
            locationNameVariations: ["final destination", "the final destination"],
            mapHint: null,
            question: "What is the final word that reveals the letter left behind?",
            correctAnswer: "TIME TURNS NOW", // Final clue answer - goes directly to final letter
            textHint: "this is just a placeholder now",
            titbits: "You have completed an incredible journey through time and space, following clues across London's historic landmarks. Each location told a story, each answer revealed a piece of the puzzle. The final destination represents the culmination of your adventure, where past and present meet, and the letter left behind from 1800 is finally revealed. This journey has connected you to history, to the stories of those who came before, and to the timeless messages that transcend centuries."
        }
    ]
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = gameData;
}
