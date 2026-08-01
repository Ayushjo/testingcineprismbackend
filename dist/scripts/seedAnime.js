"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const dns = __importStar(require("dns"));
const axios_1 = __importDefault(require("axios"));
const lib_storage_1 = require("@aws-sdk/lib-storage");
const aws_1 = require("../config/aws");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dns.setDefaultResultOrder("ipv4first");
const prisma = new client_1.PrismaClient();
async function fetchAndUploadPoster(title, year) {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    if (!TMDB_API_KEY)
        throw new Error("TMDB_API_KEY not set in .env");
    const searchRes = await axios_1.default.get("https://api.themoviedb.org/3/search/movie", {
        params: { api_key: TMDB_API_KEY, query: title, year, language: "en-US" },
    });
    const result = searchRes.data.results?.[0];
    if (!result?.poster_path) {
        console.log(`     ⚠  No TMDB poster found for "${title}" (${year})`);
        return "";
    }
    const tmdbPosterUrl = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
    const imageRes = await axios_1.default.get(tmdbPosterUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(imageRes.data);
    const key = `by-genres/${crypto.randomUUID()}.jpg`;
    const upload = new lib_storage_1.Upload({
        client: aws_1.s3Client,
        params: { Bucket: aws_1.BUCKET_NAME, Key: key, Body: buffer, ContentType: "image/jpeg" },
    });
    await upload.done();
    const s3Url = `https://${aws_1.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    console.log(`     🎌  Poster uploaded → S3`);
    return s3Url;
}
const ANIME_MOVIES = [
    {
        title: "Nausicaä of the Valley of the Wind",
        year: 1984,
        directedBy: "Hayao Miyazaki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "In a post-apocalyptic world choked by a toxic jungle and threatened by the giant insects that inhabit it, a young princess with an instinctive empathy for all living things works to prevent a war that would destroy what little remains. Hayao Miyazaki's first great film established the themes — ecological grief, feminine heroism, the violence of progress — that would run through all his subsequent work, in images of ravishing invention that no studio on earth has equalled.",
    },
    {
        title: "Castle in the Sky",
        year: 1986,
        directedBy: "Hayao Miyazaki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A boy and a girl possessing a mysterious levitation crystal are pursued across a steampunk sky by pirates, military agents, and a dangerous man who wants to use the floating island of Laputa as a weapon. Hayao Miyazaki's first Studio Ghibli production is pure adventure cinema — a film of breathless momentum, genuine danger, and images of sky and stone and ancient technology that fill children with longing and adults with something they cannot quite name.",
    },
    {
        title: "Ponyo",
        year: 2008,
        directedBy: "Hayao Miyazaki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A goldfish princess escapes from her sorcerer father's underwater domain and befriends a small boy on a cliff by the sea, setting off a magical imbalance that floods the world. Hayao Miyazaki's most deliberately childlike film is also one of his most formally radical — the animation hand-drawn with an almost deliberate roughness, the narrative operating on dream logic, the film radiating the specific warmth of something made entirely for small people and their sense of wonder.",
    },
    {
        title: "From Up on Poppy Hill",
        year: 2011,
        directedBy: "Goro Miyazaki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "In 1963 Yokohama, a high school girl who raises signal flags for her absent father at sea and a boy leading a campaign to save the school's beloved club building discover a shared connection that complicates their growing attachment to each other. Goro Miyazaki's second feature is Ghibli's most quietly accomplished work — a film about memory, loss, and the specific texture of early 1960s Japan, tender in its observation of young people who do the right thing before they know what it costs.",
    },
    {
        title: "The Wind Rises",
        year: 2013,
        directedBy: "Hayao Miyazaki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A fictional biography of Jiro Horikoshi, the aeronautical engineer who designed the Mitsubishi Zero fighter plane, tracing his lifelong dream of building beautiful aircraft alongside a love story set against the catastrophe Japan was building toward. Hayao Miyazaki's self-declared final film is his most personal and most ambivalent — a film in love with the beauty of flight and haunted by the uses beauty is put to, the most adult thing he ever made.",
    },
    {
        title: "Only Yesterday",
        year: 1991,
        directedBy: "Isao Takahata",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A twenty-seven-year-old Tokyo office worker travelling to the countryside to help with a safflower harvest finds her journey haunted by vivid memories of herself at age ten — a fifth-grader navigating first stirrings of adolescence, family tension, and the gap between the child she was and the woman she became. Isao Takahata's film is the most emotionally precise animated film ever made — a work in which nostalgia is not comfort but investigation, demanding that its protagonist answer for the person her younger self was becoming.",
    },
    {
        title: "Ocean Waves",
        year: 1993,
        directedBy: "Tomomi Mochizuki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A young man waiting in an airport reflects on a complicated relationship that formed during his high school years — a transfer student from Tokyo who disrupted the friendship between him and his best friend. Tomomi Mochizuki's made-for-TV Ghibli production is a minor work in the studio's catalogue but a quietly resonant one — a film about the way youth shapes you through friction rather than ease, rendered in animation of understated beauty.",
    },
    {
        title: "Tales from Earthsea",
        year: 2006,
        directedBy: "Goro Miyazaki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "An unbalanced world, a troubled prince, a wandering archmage, and a young woman whose past harbours a darkness — Goro Miyazaki's debut, adapted from Ursula K. Le Guin's Earthsea cycle, is a flawed but visually atmospheric fantasy that grasps at themes of mortality, shadow, and the refusal of self-knowledge that Le Guin's novels made profound.",
    },
    {
        title: "My Neighbors the Yamadas",
        year: 1999,
        directedBy: "Isao Takahata",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The cheerful, disorganised, mutually tolerant Yamada family — grandfather, grandmother, parents, teenage son, small daughter — live their small domestic life through a series of loosely connected vignettes. Isao Takahata's film, adapted from a newspaper comic strip and drawn in a deliberately loose watercolour style that mimics the strip's aesthetic, is an act of sustained affection for ordinary family life in all its forgettable, irreplaceable particularity.",
    },
    {
        title: "The Castle of Cagliostro",
        year: 1979,
        directedBy: "Hayao Miyazaki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Master thief Lupin III arrives in the tiny principality of Cagliostro to investigate a ring of counterfeit money and finds himself rescuing a princess imprisoned by the Count since childhood. Hayao Miyazaki's feature debut is a masterwork of kinetic storytelling — the chase sequences through castle grounds remain among the most exhilarating action sequences in animation, and the film's warmth and comic intelligence established the template that Ghibli would later perfect.",
    },
    {
        title: "Millennium Actress",
        year: 2001,
        directedBy: "Satoshi Kon",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A documentary filmmaker interviewing a legendary retired actress finds that her story and his intrude on each other, bleeding through the films she made into a life that was always shaped by a search for someone she briefly knew. Satoshi Kon's film is formally the most elegant thing he made — a work about cinema, memory, and the identity constructed through art, its transitions between reality, memory, and film set impossibly smooth, building to an ending of quiet devastation.",
    },
    {
        title: "Magnetic Rose",
        year: 1995,
        directedBy: "Koji Morimoto",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Two members of a deep-space salvage crew respond to a distress signal emanating from a derelict space station and find themselves inside an environment built from the memories of a deceased opera singer — a labyrinth of obsession that begins to consume them. Koji Morimoto's segment from the anthology film Memories, written by Satoshi Kon, is a masterwork of atmosphere — a science fiction ghost story of remarkable sophistication rendered in animation of staggering technical beauty.",
    },
    {
        title: "Robot Carnival",
        year: 1987,
        directedBy: "Various Directors",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Eight short films from eight directors exploring themes of robots, technology, and humanity — ranging from slapstick to elegy, from dazzling action to wordless meditation. The anthology that defined a generation of anime auteurism, Robot Carnival remains the purest demonstration of what Japanese animation could do when freed from narrative obligation and given to filmmakers with something to express.",
    },
    {
        title: "Neo Tokyo",
        year: 1987,
        directedBy: "Rintaro & Yoshiaki Kawajiri & Katsuhiro Otomo",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Three visions of a neon-lit dystopian metropolis: a girl following a cat into an impossible carnival, a race driver in a labyrinthine future circuit, a bureaucrat whose world runs on the absolute authority of a master of destruction. The anthology that preceded Akira, connecting Rintaro's surrealism, Kawajiri's violent elegance, and Otomo's satirical fury in three sequences that share a city and a mood of beautiful dread.",
    },
    {
        title: "Angel's Egg",
        year: 1985,
        directedBy: "Mamoru Oshii",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "In a world of ruined cathedrals and perpetual darkness, a small girl who tends a large mysterious egg is encountered by a soldier bearing a cross. Mamoru Oshii's most private film is almost entirely without dialogue and entirely without explanation — a work of Christian symbolism, personal crisis, and the most sombre beauty in animation, in which the question of what the egg contains is less important than the question of what it means to carry something you cannot open.",
    },
    {
        title: "Royal Space Force: The Wings of Honnêamise",
        year: 1987,
        directedBy: "Hiroyuki Yamaga",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "In a world parallel to ours, a lazy, directionless young man in the moribund Space Force volunteers to be the first person launched into orbit — less from ambition than from the absence of anything better. Hiroyuki Yamaga's Gainax debut is the most serious animated science fiction film ever made — a work that builds an entire civilisation, religion, and military-industrial complex to examine the spiritual emptiness behind the human drive to transcend.",
    },
    {
        title: "Jin-Roh: The Wolf Brigade",
        year: 1999,
        directedBy: "Hiroyuki Okiura",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "In an alternate postwar Japan under heavy political repression, a soldier from an elite anti-terrorist unit freezes at the moment of shooting a teenage girl courier and becomes entangled in a spy agency's scheme — the story braided with Little Red Riding Hood. Hiroyuki Okiura's film is the most technically accomplished animated film in the realist tradition — drawn with the weight and texture of live action, its psychological portrait of a man at the mercy of institutional forces achieving the gravity of genuine tragedy.",
    },
    {
        title: "Patlabor: The Movie",
        year: 1989,
        directedBy: "Mamoru Oshii",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The police unit responsible for giant labour robots called Labors investigates a series of berserk incidents that appear connected to the architect who designed the software running them all. Mamoru Oshii's film is procedural and philosophical in equal measure — a crime thriller whose real subject is the relationship between the city and the machines built to serve it, the urban landscape of Tokyo rendered with an almost meditative attention.",
    },
    {
        title: "Patlabor 2: The Movie",
        year: 1993,
        directedBy: "Mamoru Oshii",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A former Japan Self-Defense Forces officer engineers a false-flag attack to force Japan to confront its comfortable post-war pacifism. Mamoru Oshii's most politically serious film is dense, slow, and uncompromising — a film that uses the Labour police procedural as a frame for an argument about constitutional pacifism, state violence, and the collective amnesia that allows democracies to sustain comfortable lies, rendered in animation of extraordinary stillness.",
    },
    {
        title: "Redline",
        year: 2009,
        directedBy: "Takeshi Koike",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "An outlaw racer disqualified from qualifying for the universe's most dangerous street race through sabotage is nonetheless invited to compete on a militarised planet whose rulers have banned the event and intend to destroy all participants. Takeshi Koike's film took seven years to hand-animate and is the most purely kinetic film in animation — a work of relentless, hallucinatory velocity that makes every other animated action film look composed by comparison.",
    },
    {
        title: "Sword of the Stranger",
        year: 2007,
        directedBy: "Masahiro Ando",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A nameless swordsman who has sealed his blade encounters a young boy and his dog being hunted by a group of Chinese warriors serving an immortality-seeking emperor. Masahiro Ando's film is the high point of the action-animation tradition — a work that earns its spectacular final sword fight through thirty minutes of patient character building, in sequences animated with a gravity and physical precision that challenges comparison with the best live-action chambara.",
    },
    {
        title: "Vampire Hunter D: Bloodlust",
        year: 2000,
        directedBy: "Yoshiaki Kawajiri",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "D, the dhampir son of a vampire lord, is hired to rescue a young woman abducted by one of the most powerful vampires alive — alongside a team of competing mercenary hunters. Yoshiaki Kawajiri's gothic horror-western is the most visually accomplished film in the dark fantasy animation tradition — a work of atmospheric excess and action choreography of savage beauty, in a world whose decaying grandeur suggests civilisations that have already fallen and know it.",
    },
    {
        title: "Ninja Scroll",
        year: 1993,
        directedBy: "Yoshiaki Kawajiri",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A masterless swordsman in feudal Japan encounters a female ninja investigating a plague village and is drawn into a conspiracy involving eight demonic warriors serving a shogunate rival. Yoshiaki Kawajiri's most celebrated film is the defining work of the dark-adult anime tradition — violent, erotic, and elegantly plotted, its action sequences distinguished by a physicality and momentum that influenced an entire generation of animators worldwide.",
    },
    {
        title: "Mind Game",
        year: 2004,
        directedBy: "Masaaki Yuasa",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A young man shot dead by a yakuza negotiates with God and is returned to life with the determination to actually live it — propelling him, a childhood sweetheart, and a motley group of characters through an odyssey of escalating strangeness inside the belly of a whale. Masaaki Yuasa's debut is the most formally anarchic film in animation — a work that treats style as something to be continuously reinvented, mixing techniques, refusing consistency, and arriving somewhere utterly sui generis.",
    },
    {
        title: "Tekkonkinkreet",
        year: 2006,
        directedBy: "Michael Arias",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Two feral street orphans — Black and White — rule the labyrinthine Treasure Town with ferocity and love, resisting the yakuza developer trying to demolish it, as their bond begins to fracture under violence and grief. Michael Arias's adaptation of Taiyo Matsumoto's manga is visually unlike anything else in animation — a film of extraordinary colour and architectural imagination, its emotional core a study in how closely rage and grief and devotion are braided in children who have had to become their own parents.",
    },
    {
        title: "Belladonna of Sadness",
        year: 1973,
        directedBy: "Eiichi Yamamoto",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A peasant woman, brutalised by a feudal lord on her wedding night, makes a pact with the devil for power over her own body and becomes a force of vengeance upon the world that violated her. Eiichi Yamamoto's film is the most extreme artistic achievement in adult animation — largely still images painted in watercolour and psychedelic excess, scored by Masahiko Satoh, adapting Jules Michelet's La Sorcière into something simultaneously beautiful, traumatic, and absolutely unlike anything else made in any medium.",
    },
    {
        title: "The Tale of the Princess Kaguya",
        year: 2013,
        directedBy: "Isao Takahata",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A bamboo cutter finds a tiny girl inside a luminous stalk, raises her as his daughter, and watches as she grows into a woman of supernatural beauty — desired by the highest men in the land and destined for a return that no earthly love can prevent. Isao Takahata's final film is animated in charcoal and watercolour with the feeling of something being drawn in the moment it is watched — a film about what it means to be given a life you did not ask for and must nonetheless grieve when it ends.",
    },
    {
        title: "When Marnie Was There",
        year: 2014,
        directedBy: "Hiromasa Yonebayashi",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "An isolated, self-hating twelve-year-old sent to the countryside for her health befriends a mysterious blonde girl who lives in the old mansion across the marsh — a girl who may not exist in the present. Hiromasa Yonebayashi's film is Ghibli's most psychologically interior work — a study in the specific misery of adolescent self-contempt and the way the past persists in the people who carry it, with an ending whose revelation reorganises everything preceding it.",
    },
    {
        title: "Arrietty",
        year: 2010,
        directedBy: "Hiromasa Yonebayashi",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A tiny girl from a family of Borrowers — small people who live under the floors of human houses and take what they need without being seen — is discovered by the sickly boy who comes to stay in the house above them. Hiromasa Yonebayashi's Ghibli debut is the studio's most intimate film — built on the scale difference between its protagonists, the giant ordinary world rendered strange and beautiful from below, the friendship between Arrietty and Shawn charged with the sadness of an impossible intimacy.",
    },
    {
        title: "Pom Poko",
        year: 1994,
        directedBy: "Isao Takahata",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A community of tanuki — raccoon dogs gifted with magical shape-shifting powers — wage an increasingly desperate campaign against the developers destroying the Tama Hills outside Tokyo, using their illusions to frighten away the humans encroaching on their forest. Isao Takahata's film is the most politically direct of Ghibli's ecological allegories — a film that is funny, sad, and genuinely angry, whose creatures lose because the real world does not reward magic.",
    },
    {
        title: "Porco Rosso",
        year: 1992,
        directedBy: "Hayao Miyazaki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A veteran World War I flying ace, cursed into the form of a pig, works as a freelance bounty hunter over the Adriatic, navigating air pirates, a young female engineer who rebuilds his plane, and the American rival hired to destroy him. Hayao Miyazaki's most personal film is also his least explained — a work of Mediterranean light and aerial freedom whose central mystery (how and why the curse) is never disclosed, the pig-man's shame and dignity left for the viewer to carry.",
    },
    {
        title: "The Garden of Words",
        year: 2013,
        directedBy: "Makoto Shinkai",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A sixteen-year-old aspiring shoemaker skips school on rainy mornings to sit in a Tokyo garden, where he repeatedly encounters a woman who is skipping work for reasons she will not disclose. Makoto Shinkai's 46-minute film is the pinnacle of photorealistic anime — rain rendered with such precision that it becomes almost unbearable to watch, the garden sequences existing in a suspension outside ordinary time that the film's final act violently dissolves.",
    },
    {
        title: "Children Who Chase Lost Voices",
        year: 2011,
        directedBy: "Makoto Shinkai",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A girl discovers a music that calls to her from deep underground and descends into a hidden world called Agartha — a mythological underland of the dead — in search of a boy she briefly knew, accompanied by a teacher whose grief has taken the same direction. Makoto Shinkai's most ambitious film reaches for the mythological scale of Miyazaki and achieves it intermittently — a work of great visual beauty about the refusal of grief to observe the border between the living and the dead.",
    },
    {
        title: "The Place Promised in Our Early Days",
        year: 2004,
        directedBy: "Makoto Shinkai",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Two boys in a divided alternate Japan build a plane to reach a mysterious tower that rises from the occupied north, and promise the girl they both love that they will fly her there — a promise suspended for three years by circumstance, war, and a sleep that is also a prophecy. Makoto Shinkai's debut feature is the work in which his visual sensibility was fully formed before his storytelling caught up to it — melancholy, luminous, and reaching for a grandeur it nearly grasps.",
    },
    {
        title: "009 Re:Cyborg",
        year: 2012,
        directedBy: "Kenji Kamiyama",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The nine cyborg superheroes of the classic 1960s manga are summoned back into action when a series of anonymous bombings of skyscrapers across the world appears to originate with ordinary people receiving commands from a higher voice. Kenji Kamiyama's CG-animated film is a post-9/11 theological thriller — dense with ideas about divine command, collective guilt, and the terrorism of the sacred, rendered in a visual style that polarised audiences and rewarded the patient.",
    },
    {
        title: "Expelled from Paradise",
        year: 2014,
        directedBy: "Seiji Mizushima",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "An agent from a digital society where humanity has abandoned physical bodies is installed in a clone body to track down a hacker broadcasting utopian messages from the ruined surface of Earth. Seiji Mizushima's CG film uses the sci-fi premise of digitised consciousness to examine what is lost when the body — its hunger, its fragility, its capacity for surprise — is discarded in the name of efficiency.",
    },
    {
        title: "Harmony",
        year: 2015,
        directedBy: "Michael Arias & Takashi Nakamura",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "In a utopian future where citizens are monitored for optimal health, a woman investigating a mass suicide attempt discovers a conspiracy at the heart of the wellness state — tracing back to a childhood friend who wanted to destroy the world that claimed to be saving it. Adapted from Project Itoh's novel, the film is a rare work of genuinely philosophical animated science fiction, merging cyberpunk aesthetics with questions about consciousness, free will, and the price of administered happiness.",
    },
    {
        title: "Psycho-Pass: The Movie",
        year: 2015,
        directedBy: "Kiyotaka Suzuki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Inspector Tsunemori pursues a lead to a Southeast Asian nation using Sibyl System technology to manage its civil war, and finds a former enforcer who has chosen a life of physical combat over the system's managed peace. The theatrical extension of the television series is tighter than most franchise films, using its new setting to examine whether a surveillance state can be just even when it delivers measurable order.",
    },
    {
        title: "Psycho-Pass: Sinners of the System",
        year: 2019,
        directedBy: "Naoyoshi Shiotani",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Three theatrical films — each following a different set of characters from the Psycho-Pass world — investigate the edges of the Sibyl System's reach: a pursuit into Hokkaido, a diplomat mission into Southeast Asia, and a philosophical confrontation with the system's architect. The triptych format allows the franchise its most rigorous examination of whether justice and administered order are the same thing.",
    },
    {
        title: "Demon Slayer: Mugen Train",
        year: 2020,
        directedBy: "Haruo Sotozaki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Tanjiro and his companions board a train with the legendary Flame Hashira Rengoku to investigate a demon who has made the night journey its hunting ground. Haruo Sotozaki's film became the highest-grossing Japanese film of all time on the sustained strength of its action sequences — specifically the final confrontation, which elevated Rengoku into one of the most beloved figures in recent anime through the force of his absolute, consuming commitment to his duty.",
    },
    {
        title: "Jujutsu Kaisen 0",
        year: 2021,
        directedBy: "Sunghoo Park",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A boy cursed with a special grade spirit bound to the girl he loved enrolls in Jujutsu High to control his power, while a conspiracy to unleash a Night Parade of a Hundred Demons approaches. Sunghoo Park's theatrical prequel to the television series is the most kinetically animated film in the recent action-anime wave — the duel between Yuta and Geto staged at a scale and fluidity that made it the event film of its year.",
    },
    {
        title: "One Piece Film: Strong World",
        year: 2009,
        directedBy: "Munehisa Sakai",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The Straw Hat Pirates are separated across a network of flying islands by the legendary pirate Shiki, who has a plan to use their navigator Nami as part of a plot to destroy the East Blue. The first One Piece theatrical film to be written by series creator Eiichiro Oda, Strong World restored the franchise's cinema presence with a villain of genuine weight and action sequences that matched the ambition of the source material.",
    },
    {
        title: "One Piece Film: Z",
        year: 2012,
        directedBy: "Tatsuya Nagamine",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A former Marine admiral known as Z seeks to destroy the New World and everything in it with a weapon capable of igniting the ancient volcanos that underpin the Grand Line — while Luffy and his crew, who briefly allied with him, try to stop a man whose grievance against the world is not entirely wrong. Tatsuya Nagamine's film gave the franchise its most morally complex antagonist — a figure whose conviction is indistinguishable from tragedy.",
    },
    {
        title: "One Piece Film: Gold",
        year: 2016,
        directedBy: "Hiroaki Miyamoto",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The Straw Hat Pirates arrive at Gran Tesoro, the world's largest entertainment ship, and fall into the trap of a man who has imprisoned thousands using the power of gold. Hiroaki Miyamoto's film is the most visually spectacular of the One Piece theatrical entries — a film of golden excess and theatrical villainy that uses its casino setting to explore the seductiveness and cruelty of a world built on debt.",
    },
    {
        title: "One Piece Film: Red",
        year: 2022,
        directedBy: "Goro Taniguchi",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The world's most beloved singer, Uta, revealed to be the daughter of the emperor Shanks, performs a concert that conceals a plan to trap the world in a dreamlike utopia where suffering is impossible. Goro Taniguchi's film is a musical-fantasy built around original songs by Ado, and the most emotionally ambitious One Piece theatrical film — a work about the cost of trying to protect people from the pain of being alive.",
    },
    {
        title: "Dragon Ball Z: Battle of Gods",
        year: 2013,
        directedBy: "Masahiro Hosoda",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The God of Destruction Beerus awakens from a long sleep to seek the Super Saiyan God prophesied in a dream, arriving on Earth during Bulma's birthday party with the easy confidence of someone who has never met anyone capable of giving him a real fight — until Goku transforms. Masahiro Hosoda's film revived the Dragon Ball franchise after a seventeen-year theatrical absence, balancing comedy and spectacle with a genuine sense of scale that the series had not achieved since the Cell Saga.",
    },
    {
        title: "Dragon Ball Super: Broly",
        year: 2018,
        directedBy: "Tatsuya Nagamine",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The Saiyan warrior Broly, raised alone on a hostile planet by a father consumed by a decades-old grievance, is brought to Earth to destroy Goku and Vegeta — and the battle that follows pushes the animation of the franchise beyond anything previously achieved. Tatsuya Nagamine's film canonised Broly while simultaneously using the character to examine the cruelty of raising a child as a weapon, in sequences of kinetic invention that set a new standard for televised action animation.",
    },
    {
        title: "The Last: Naruto the Movie",
        year: 2014,
        directedBy: "Tsuneo Kobayashi",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Two years after the Fourth Great Ninja War, Naruto must confront his feelings for Hinata as the moon begins to descend toward Earth under the influence of a descendant of the Sage of Six Paths. Tsuneo Kobayashi's film serves as the epilogue the television series needed — finally resolving Naruto's emotional life with the directness that the long-running series had always deferred, the action sequences finding space in between genuine romantic feeling.",
    },
    {
        title: "Boruto: Naruto the Movie",
        year: 2015,
        directedBy: "Hiroyuki Yamashita",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Naruto's son Boruto, resentful of an absent father who is now the Hokage of the Hidden Leaf Village, enters the Chunin Exams with his team while a threat from the Otsutsuki clan targets the village. Hiroyuki Yamashita's film functions as a generational handoff — a work more interested in the father-son relationship at its centre than in its antagonists, finding in Naruto's absence the most honest portrayal of what it means to have succeeded at the cost of being present.",
    },
    {
        title: "Pokémon: The First Movie",
        year: 1998,
        directedBy: "Kunihiko Yuyama",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Mewtwo, a genetically engineered clone of the legendary Mew, concludes that humanity's use of Pokémon is exploitation, creates clones of the world's strongest Pokémon to destroy them, and invites trainers to an island for a battle that is also a reckoning. Kunihiko Yuyama's film is the franchise at its most philosophically serious — a children's film whose central argument about ownership, identity, and whether a clone's life has inherent worth was more than its target audience was given credit for processing.",
    },
    {
        title: "Pokémon: Mewtwo Strikes Back—Evolution",
        year: 2019,
        directedBy: "Kunihiko Yuyama & Motonori Sakakibara",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A CG-animated remake of the original Mewtwo film — retelling the story of the psychic clone's rebellion against the trainers who would use him — that serves less as a replacement than a preservation, reconfirming the original's story in a new visual language for a generation that encountered it first as parents rather than children.",
    },
    {
        title: "Belle",
        year: 2021,
        directedBy: "Mamoru Hosoda",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A shy teenage girl who cannot sing since her mother's death becomes a global phenomenon as her avatar Belle in the vast online world of U — until she begins to investigate the mysterious Beast whose virtual castle is besieged by vigilante Justices. Mamoru Hosoda's film is the Beauty and the Beast myth adapted to the specific conditions of internet celebrity, anonymity, and the courage required to be seen as oneself rather than as one's performance.",
    },
    {
        title: "Digimon: Our War Game!",
        year: 2000,
        directedBy: "Mamoru Hosoda",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Taichi and Koushiro discover a hostile Digimon evolving at catastrophic speed inside the internet while the rest of their team is unreachable and a missile targeting the infected computer counts down. Mamoru Hosoda's forty-minute film is the prototype for Summer Wars — a work of remarkable tension derived from the absurdity of children saving the world from their home computers, the digital threat given genuine stakes through the specificity of the digital world it occupies.",
    },
    {
        title: "Mobile Suit Gundam: Char's Counterattack",
        year: 1988,
        directedBy: "Yoshiyuki Tomino",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The final confrontation between Amuro Ray and Char Aznable — the Red Comet — over Char's plan to plunge asteroids into Earth to force humanity into space, ending a rivalry that has defined the Universal Century timeline since 0079. Yoshiyuki Tomino's film is the most operatic work in the mecha genre — a collision between two men whose hatred is so intimate it resembles love, in a battle over the future of the human species that ends in the most enigmatic image in Gundam history.",
    },
    {
        title: "Mobile Suit Gundam Hathaway",
        year: 2021,
        directedBy: "Shukou Murase",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Bright Noa's son Hathaway, operating under the name Mafty, leads a terrorist organisation targeting Earth Federation officials who profit from the exploitation of space colonies — while on a passenger liner he meets both the general he plans to kill and a woman with uncertain allegiances. Shukou Murase's adaptation of Tomino's novel is the most visually sophisticated Gundam film — photorealistic, nocturnal, and morally serious about the conditions under which terrorism might represent a rational choice.",
    },
    {
        title: "Evangelion: 1.0 You Are (Not) Alone",
        year: 2007,
        directedBy: "Hideaki Anno",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The first film of the Rebuild of Evangelion tetralogy condenses the early television episodes into a tighter, more visually spectacular form — Shinji Ikari called to Tokyo-3 by his absent father to pilot the massive bio-mechanical EVA-01 against the Angels, beginning an arc of self-destruction and dependent attachment that will take four films to resolve. Anno restores the television series' opening in a new key: recognisably the same story, with something changed that the later films will reveal.",
    },
    {
        title: "Evangelion: 2.0 You Can (Not) Advance",
        year: 2009,
        directedBy: "Hideaki Anno",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The second Rebuild film diverges from the television series in ways that accumulate slowly and then accelerate into the most emotionally overwhelming sequence in the franchise — Shinji's attempt to save Rei triggering a Third Impact that the film cuts away from at the moment of catastrophe. The film that made clear the Rebuild was not a retelling but a genuinely new story with the same people, building toward something the original had only gestured at.",
    },
    {
        title: "Evangelion: 3.0 You Can (Not) Redo",
        year: 2012,
        directedBy: "Hideaki Anno",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Fourteen years after Second Impact, Shinji wakes to find the world transformed and everyone he knew older and hostile — then meets Kaworu Nagisa and begins to understand that every attempt to do the right thing has only deepened the catastrophe. The most controversial film in the franchise is also the most courageous — a work about guilt and the impossibility of repair that refuses the comfort of allowing its protagonist to be forgiven, in a world that has long since stopped waiting for him.",
    },
    {
        title: "Evangelion: 3.0+1.0 Thrice Upon a Time",
        year: 2021,
        directedBy: "Hideaki Anno",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The final Rebuild film opens in a ruined Paris, follows Shinji through a period of recovery in a village untouched by Impact, and builds toward a confrontation with Gendo Ikari that becomes a conversation — the film using its climax to offer both characters what the original series denied them: the possibility of explanation and release. Anno's farewell to Evangelion is generous where the original was punishing, and earns its peace precisely because it knows what it is letting go of.",
    },
    {
        title: "Night on the Galactic Railroad",
        year: 1985,
        directedBy: "Gisaburo Sugii",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A lonely boy whose father is missing and whose best friend has a fatal illness boards a mysterious train that travels through the galaxy toward a destination neither passenger can name. Gisaburo Sugii's adaptation of Kenji Miyazawa's unfinished novel — with cats standing in for humans, as Miyazawa seemed to have intended — is one of animation's most purely spiritual films: a meditation on death, friendship, and sacrifice rendered in imagery of extraordinary celestial beauty.",
    },
    {
        title: "Space Runaway Ideon: Be Invoked",
        year: 1982,
        directedBy: "Yoshiyuki Tomino",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "The conclusion of the cancelled television series — the crew of the alien super-robot Ideon and the alien fleet pursuing them hurtle toward a mutual annihilation that the Ideon's incomprehensible power has been building toward all along. Yoshiyuki Tomino's film is the most nihilistic work in mecha animation — a film in which every character dies, in which the universe itself is destroyed and remade, and whose final sequence of souls ascending in peace achieves something that can only be described as transcendent.",
    },
    {
        title: "Barefoot Gen",
        year: 1983,
        directedBy: "Mori Masaki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A young boy in Hiroshima survives the atomic bombing of August 6th, 1945, and navigates the aftermath — the bodies, the radiation sickness, the collapse of the world he knew — with a ferocious determination to live. Mori Masaki's film is the most important anti-war animated film ever made: a direct, unsparing, and finally hopeful account of nuclear annihilation as experienced by a child, drawn with the simplicity of the manga from which it is adapted and the gravity of a subject that permits no aesthetic distance.",
    },
    {
        title: "Colorful",
        year: 2010,
        directedBy: "Keiichi Hara",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A disembodied soul given a second chance at life is placed inside the body of a fourteen-year-old boy who has just killed himself, tasked with discovering the sin it committed in its previous life while learning, gradually, what made the boy's life unliveable. Keiichi Hara's film is the most compassionate animated work about adolescent depression — a film that takes seriously the specific intolerable weight of being fourteen, without making that weight glamorous or without exit.",
    },
    {
        title: "The Anthem of the Heart",
        year: 2015,
        directedBy: "Tatsuyuki Nagai",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A girl cursed to have her words cause harm — by an egg fairy who appears after her careless words destroyed her parents' marriage — joins a musical project at school that requires her to express herself through song. Tatsuyuki Nagai's film, from a screenplay by Mari Okada, is a work about the terror of self-expression and the specific loneliness of believing that what you feel is damage others do not need to receive.",
    },
    {
        title: "Hal",
        year: 2013,
        directedBy: "Ryotaro Makihara",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A young woman devastated by the death of her boyfriend in a plane crash is given a robot built to resemble him, its mission to complete the cube puzzle her boyfriend never finished — and to gradually lead her back to the world. Ryotaro Makihara's hour-long film is a grief study that uses the android premise to examine what we ask of the dead when we cannot let them go — with a twist that reframes the entire film as something other than it appeared.",
    },
    {
        title: "Liz and the Blue Bird",
        year: 2018,
        directedBy: "Naoko Yamada",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Two high school girls in a wind ensemble — the outgoing oboist Mizore and the radiant flautist Nozomi — rehearse a piece about a fairy tale in which a girl befriends a blue bird without understanding what the story requires of her, as the nature of their asymmetric attachment becomes impossible to avoid. Naoko Yamada's film is the most formally precise anime released this decade — a work of extraordinary attention to the way bodies express what words will not, the music serving as the language of everything the girls cannot say directly.",
    },
    {
        title: "Maquia: When the Promised Flower Blooms",
        year: 2018,
        directedBy: "Mari Okada",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A girl from an immortal race of weavers who remain eternally young flees her destroyed homeland and finds a newborn baby to raise — watching him grow from infancy through youth and aging while she does not change, the film spanning decades of a mother-son relationship between people whose relationship to time is irreconcilable. Mari Okada's directorial debut is a work of sustained emotional ambition — a meditation on maternal love as something that does not require blood or youth or the possibility of ever being met as an equal.",
    },
    {
        title: "The Cat Returns",
        year: 2002,
        directedBy: "Hiroyuki Morita",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A girl who rescues a cat from traffic discovers that the cat is a prince, and is invited — then abducted — to the Cat Kingdom, where she begins involuntarily transforming into a cat. Hiroyuki Morita's Ghibli spin-off is the studio's lightest and most purely comic film — a cheerful adventure that moves at enormous speed through a world of talking cats and hidden kingdoms, anchored by the Baron, a dapper figurine who comes to life with an aristocratic authority that makes everything around him funnier.",
    },
    {
        title: "Earwig and the Witch",
        year: 2020,
        directedBy: "Goro Miyazaki",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A self-possessed girl raised in an orphanage is adopted by a witch who wants her as an assistant — and sets about learning the witch's magic through persistent, cheerful determination. Goro Miyazaki's CG-animated Ghibli film, the studio's first in full computer graphics, is a modest work of considerable charm — less a complete story than an extended first chapter, distinguished by its protagonist's unflappable confidence in a world that underestimates her.",
    },
    {
        title: "A Letter to Momo",
        year: 2011,
        directedBy: "Hiroyuki Okiura",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A girl who moves with her mother to a remote island following her father's death — the last thing he wrote was the beginning of a letter to her that he never finished — discovers three slovenly supernatural creatures living in her attic who create chaos while somehow helping her grieve. Hiroyuki Okiura's film took eleven years to complete and rewards the patience — a work of exceptional animation craft that treats yokai as messy, comic, and ultimately compassionate presences in a child's necessary confrontation with loss.",
    },
    {
        title: "Penguin Highway",
        year: 2018,
        directedBy: "Hiroyuki Morita",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A precociously rational fourth-grader investigating the sudden appearance of penguins in his landlocked suburban town traces the phenomenon to the young woman who works at his dentist's office — and the relationship between them becomes an investigation into a mystery larger than the penguins. The Studio Colorido production is a film about the specific intellectual joy of a child who believes that everything can be understood if you ask the right questions, and the more specific tenderness of an adult who finds in that belief something worth protecting.",
    },
    {
        title: "Giovanni's Island",
        year: 2014,
        directedBy: "Mizuho Nishikubo",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "On the small island of Shikotan at the end of World War II, two Japanese brothers whose father is imprisoned by the Soviet occupation befriend the daughter of a Soviet commander — a friendship that the politics of 1945 will not allow to survive. Mizuho Nishikubo's film uses Night on the Galactic Railroad as its children's book to frame a story about occupation, childhood, and the specific cruelty of history happening to people too young to understand why.",
    },
    {
        title: "Patema Inverted",
        year: 2013,
        directedBy: "Yasuhiro Yoshiura",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "A girl from an underground society where gravity pulls downward encounters a boy from a surface society where it pulls upward — and the world each of them thought was right-side-up is the other's ceiling. Yasuhiro Yoshiura's film deploys its central conceit with rigour and visual imagination, using the inverted gravity as a literal figure for a society that has taught itself to see the other as the one who will fall.",
    },
    {
        title: "The Empire of Corpses",
        year: 2015,
        directedBy: "Ryotaro Makihara",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "In a steampunk Victorian England where Frankenstein's discovery has made reanimated corpses the world's labour force, a young medical student named Watson agrees to work for British intelligence in exchange for access to the notes that might restore his dead friend's soul — a quest that crosses continents and encounters Hadaly, the Note, and the possibility that consciousness cannot be reanimated. Production I.G.'s adaptation of Project Itoh's posthumous novel is ambitious, dense, and haunted by the question it cannot answer.",
    },
    {
        title: "Fireworks",
        year: 2017,
        directedBy: "Akiyuki Shinbo & Nobuyuki Takeuchi",
        genre: ["Animation"],
        posterImageUrl: "",
        synopsis: "Two boys argue about whether fireworks are flat or round when seen from the side, while one of them, given a mysterious sphere that can restart time, relives a summer day in which a girl he likes runs away from home — and keeps finding the moment his nerve fails him. Shinbo and Takeuchi's SHAFT production is a film of extraordinary visual ambition and narrative modesty — the time-loop device used not to solve a problem but to circle an adolescent feeling that cannot be resolved, only felt more deeply.",
    },
];
async function main() {
    console.log(`\nTheCinePrism — Anime Seed`);
    console.log(`Total: ${ANIME_MOVIES.length} films\n`);
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    for (const movie of ANIME_MOVIES) {
        console.log(`\n→ ${movie.title} (${movie.year})`);
        try {
            const existing = await prisma.byGenres.findFirst({
                where: { title: movie.title, year: movie.year },
                select: { id: true, genre: true },
            });
            if (existing) {
                const missingGenres = movie.genre.filter((g) => !existing.genre.includes(g));
                if (missingGenres.length === 0) {
                    console.log(`  ⏭  Already in DB — skipping`);
                    skipped++;
                }
                else {
                    const mergedGenres = Array.from(new Set([...existing.genre, ...movie.genre]));
                    await prisma.byGenres.update({
                        where: { id: existing.id },
                        data: { genre: mergedGenres },
                    });
                    console.log(`  ✏  Updated genres — added: ${missingGenres.join(", ")}`);
                    inserted++;
                }
                continue;
            }
            let posterUrl = movie.posterImageUrl;
            if (!posterUrl) {
                posterUrl = await fetchAndUploadPoster(movie.title, movie.year);
                await new Promise((r) => setTimeout(r, 300));
            }
            await prisma.byGenres.create({
                data: {
                    title: movie.title,
                    year: movie.year,
                    directedBy: movie.directedBy,
                    genre: movie.genre,
                    posterImageUrl: posterUrl,
                    synopsis: movie.synopsis,
                },
            });
            console.log(`  ✓  Inserted`);
            inserted++;
        }
        catch (err) {
            console.error(`  ✗  Error: ${err.message}`);
            errors++;
        }
    }
    console.log(`\n─────────────────────────────────────────`);
    console.log(`Inserted / Updated: ${inserted}`);
    console.log(`Skipped (already in DB): ${skipped}`);
    if (errors > 0)
        console.log(`Errors: ${errors}`);
    console.log(`─────────────────────────────────────────\n`);
}
main()
    .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
