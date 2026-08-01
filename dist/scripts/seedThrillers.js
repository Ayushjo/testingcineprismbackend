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
const axios_1 = __importDefault(require("axios"));
const lib_storage_1 = require("@aws-sdk/lib-storage");
const aws_1 = require("../config/aws");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const prisma = new client_1.PrismaClient();
// ─── TMDB + S3 Poster Helper ──────────────────────────────────────────────────
async function fetchAndUploadPoster(title, year) {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    if (!TMDB_API_KEY)
        throw new Error("TMDB_API_KEY not set in .env");
    // 1. Search TMDB for the movie
    const searchRes = await axios_1.default.get("https://api.themoviedb.org/3/search/movie", {
        params: { api_key: TMDB_API_KEY, query: title, year, language: "en-US" },
    });
    const result = searchRes.data.results?.[0];
    if (!result?.poster_path) {
        console.log(`     ⚠  No TMDB poster found for "${title}" (${year})`);
        return "";
    }
    // 2. Download the poster image as a buffer
    const tmdbPosterUrl = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
    const imageRes = await axios_1.default.get(tmdbPosterUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(imageRes.data);
    // 3. Upload directly to S3 (same bucket + folder as admin panel)
    const key = `by-genres/${crypto.randomUUID()}.jpg`;
    const upload = new lib_storage_1.Upload({
        client: aws_1.s3Client,
        params: {
            Bucket: aws_1.BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: "image/jpeg",
        },
    });
    await upload.done();
    const s3Url = `https://${aws_1.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    console.log(`     🎬  TMDB poster uploaded → S3`);
    return s3Url;
}
const THRILLER_MOVIES = [
    {
        title: "Zodiac",
        year: 2007,
        directedBy: "David Fincher",
        genre: ["Thriller", "Crime", "Mystery"],
        posterImageUrl: "",
        synopsis: "Set against the shadow of an unsolved serial killer who terrorized the San Francisco Bay Area through the late 1960s and 70s, David Fincher's Zodiac is less a horror film than a study in obsession. A cartoonist, a reporter, and a detective each lose years — and pieces of themselves — to a killer who may never be caught. Fincher strips away genre thrills in favour of procedural dread, constructing a film about the unbearable weight of an unanswered question.",
    },
    {
        title: "Chinatown",
        year: 1974,
        directedBy: "Roman Polanski",
        genre: ["Thriller", "Crime", "Mystery", "Neo-Noir"],
        posterImageUrl: "",
        synopsis: "Private detective J.J. Gittes is hired to investigate a routine infidelity case in 1930s Los Angeles. What he uncovers instead is a conspiracy of water rights, power, and moral rot so deep it makes the city itself feel complicit. Roman Polanski's neo-noir masterpiece, written by Robert Towne, remains cinema's most devastating meditation on the corruption beneath the sun-drenched American dream — a film that ends not with resolution, but with annihilation.",
    },
    {
        title: "The Third Man",
        year: 1949,
        directedBy: "Carol Reed",
        genre: ["Thriller", "Mystery", "Film Noir"],
        posterImageUrl: "",
        synopsis: "An American pulp novelist arrives in post-war Vienna to visit his friend Harry Lime, only to discover that Lime has just died under suspicious circumstances. As he investigates, a shadowy figure glimpsed at night begins to unravel a conspiracy of black market penicillin and moral compromise. Carol Reed's expressionist noir, shot in the bombed-out rubble of occupied Vienna with one of cinema's most iconic scores, is a portrait of disillusionment that has never dated.",
    },
    {
        title: "The Conversation",
        year: 1974,
        directedBy: "Francis Ford Coppola",
        genre: ["Thriller", "Drama", "Mystery"],
        posterImageUrl: "",
        synopsis: "Harry Caul is the best surveillance man in the business — and the most paranoid. When a routine wiretapping job leaves him convinced he has recorded evidence of a planned murder, his professional detachment begins to crack. Francis Ford Coppola's prescient meditation on privacy, guilt, and the surveillance state is threaded through with the anxious hum of reel-to-reel tape and a Gene Hackman performance of extraordinary interior intensity.",
    },
    {
        title: "Blow-Up",
        year: 1966,
        directedBy: "Michelangelo Antonioni",
        genre: ["Thriller", "Mystery", "Drama"],
        posterImageUrl: "",
        synopsis: "A fashionable London photographer believes he may have accidentally captured a murder on film. But the more he enlarges the images, the less certain he becomes of what he has seen. Michelangelo Antonioni's enigmatic thriller is less interested in solving its mystery than in dissolving it — a film about the unreliability of images, the hollow spectacle of swinging London, and the impossibility of knowing anything for certain.",
    },
    {
        title: "Blow Out",
        year: 1981,
        directedBy: "Brian De Palma",
        genre: ["Thriller", "Mystery", "Crime"],
        posterImageUrl: "",
        synopsis: "A film sound recordist accidentally captures on tape what he believes to be a political assassination disguised as a car accident. As he pieces the audio evidence together, he becomes dangerously entangled in a cover-up that threatens everything. Brian De Palma's most Hitchcockian film is a bracingly cynical work about the American political imagination — shot through with genuine dread and formal virtuosity that reveals its full horror only in the final frames.",
    },
    {
        title: "The French Connection",
        year: 1971,
        directedBy: "William Friedkin",
        genre: ["Thriller", "Crime", "Action"],
        posterImageUrl: "",
        synopsis: "NYPD narcotics detective Jimmy 'Popeye' Doyle becomes obsessed with busting a massive heroin shipment from France, following hunches and breaking rules in equal measure. William Friedkin's Oscar-winning thriller rewrote the grammar of the police procedural — raw, unglamorous, and propelled by one of the most viscerally exciting car chases in cinema history. A film that made audiences distrust its hero and love him anyway.",
    },
    {
        title: "No Country for Old Men",
        year: 2007,
        directedBy: "Joel Coen & Ethan Coen",
        genre: ["Thriller", "Crime", "Drama", "Neo-Noir"],
        posterImageUrl: "",
        synopsis: "A hunter stumbles upon the bloody aftermath of a drug deal gone wrong in the Texas desert and makes the fatal mistake of taking the money. What follows is the Coen Brothers at their most merciless — a pursuit across bleak West Texas landscapes by Anton Chigurh, a hitman of almost philosophical menace. Adapted from Cormac McCarthy's novel, the film asks what a man can do when evil has no motive, no weakness, and no end.",
    },
    {
        title: "Blood Simple",
        year: 1984,
        directedBy: "Joel Coen",
        genre: ["Thriller", "Crime", "Film Noir"],
        posterImageUrl: "",
        synopsis: "A jealous Texas bar owner hires a private detective to kill his unfaithful wife and her lover. What follows is a chain of misunderstandings, botched killings, and paranoid reversals that dismantles genre convention with surgical precision. The Coen Brothers' debut is a reminder that film noir's greatest weapon is not violence but information — specifically, the fatal gap between what the audience knows and what each character believes.",
    },
    {
        title: "Blue Velvet",
        year: 1986,
        directedBy: "David Lynch",
        genre: ["Thriller", "Mystery", "Drama"],
        posterImageUrl: "",
        synopsis: "A college student returning to his sleepy hometown discovers a severed human ear in a field and follows it into a nightmare world of sexual violence, criminal perversion, and darkness hidden beneath a surface of white picket fences and robins on lawns. David Lynch's most visceral film is a sustained assault on the American pastoral — at once deeply disturbing and intoxicatingly beautiful, a film that refuses to let you forget what it has shown you.",
    },
    {
        title: "Mulholland Drive",
        year: 2001,
        directedBy: "David Lynch",
        genre: ["Thriller", "Mystery", "Drama"],
        posterImageUrl: "",
        synopsis: "An aspiring actress arrives in Los Angeles and encounters a mysterious amnesiac woman who has survived a car crash on Mulholland Drive. Together they follow a trail of clues that fractures into dream, delusion, and desire. David Lynch's hypnotic masterpiece operates as both a love letter to Hollywood and a horror film about the cost of feeding its mythology — a puzzle designed to be felt rather than solved.",
    },
    {
        title: "Lost Highway",
        year: 1997,
        directedBy: "David Lynch",
        genre: ["Thriller", "Mystery", "Drama"],
        posterImageUrl: "",
        synopsis: "A jazz musician wakes in a prison cell, convicted of murdering his wife — a crime he cannot remember committing. Then, inexplicably, he transforms into an entirely different man. David Lynch's most uncompromising film is a Möbius strip of identity, guilt, and dissociation, wrapped in industrial dread and neon-lit shadows. It is not a mystery to be decoded but an experience to be survived.",
    },
    {
        title: "Caché",
        year: 2005,
        directedBy: "Michael Haneke",
        genre: ["Thriller", "Drama", "Mystery"],
        posterImageUrl: "",
        synopsis: "A Parisian television host and his wife begin receiving anonymous surveillance tapes of their home, along with cryptic drawings. The source remains unknown, but the tapes begin to dredge up buried guilt from the man's childhood. Michael Haneke's masterwork weaponises the thriller form against its audience — a film about bourgeois complicity, colonial guilt, and the impossible comfort of choosing not to know what you have done.",
    },
    {
        title: "Funny Games",
        year: 1997,
        directedBy: "Michael Haneke",
        genre: ["Thriller", "Drama", "Horror"],
        posterImageUrl: "",
        synopsis: "Two young men in white gloves take a bourgeois family hostage in their lakeside vacation home and subject them to escalating psychological and physical torment — while addressing the audience directly. Michael Haneke's furious provocation refuses to deliver the catharsis that genre violence promises. It is a film designed to make viewers uncomfortable with their own desire to watch.",
    },
    {
        title: "The Vanishing",
        year: 1988,
        directedBy: "George Sluizer",
        genre: ["Thriller", "Mystery", "Drama"],
        posterImageUrl: "",
        synopsis: "On a road trip through France, a woman disappears at a highway rest stop. Her boyfriend spends three years searching for her, haunted not by grief but by the unbearable need to know. George Sluizer's Dutch thriller builds to one of cinema's most quietly devastating revelations — an ending that redefines everything before it, and that has never been equalled for sheer, cold horror.",
    },
    {
        title: "Tell No One",
        year: 2006,
        directedBy: "Guillaume Canet",
        genre: ["Thriller", "Mystery", "Drama"],
        posterImageUrl: "",
        synopsis: "Eight years after his wife was murdered, a Parisian paediatrician receives an anonymous email containing footage of a woman who appears to be her — alive. As he races to find answers, the police reopen the case and he becomes the prime suspect. Guillaume Canet's propulsive French thriller turns the screws with uncommon intelligence, delivering genre entertainment while never forgetting the emotional devastation at its heart.",
    },
    {
        title: "Memories of Murder",
        year: 2003,
        directedBy: "Bong Joon-ho",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "Based on South Korea's first documented serial murder case, Bong Joon-ho's breakthrough film follows two provincial detectives — one brutish and instinct-driven, one methodical and rational — as they pursue a killer who leaves no trace. Set in the rural Korea of the 1980s under authoritarian rule, the film turns procedural frustration into something approaching tragedy: a story about incompetence, institutional failure, and the horror of a mystery that simply refuses to be solved.",
    },
    {
        title: "Decision to Leave",
        year: 2022,
        directedBy: "Park Chan-wook",
        genre: ["Thriller", "Mystery", "Romance"],
        posterImageUrl: "",
        synopsis: "A detective investigating a man's death on a cliffside becomes obsessed with the victim's elegant widow — a Chinese immigrant whose calm manner he cannot read. Park Chan-wook's formally dazzling film transforms the detective thriller into a meditation on desire, surveillance, and the strange grammar of love. Tender and lethal in equal measure, it is one of the most quietly devastating films of recent years.",
    },
    {
        title: "I Saw the Devil",
        year: 2010,
        directedBy: "Kim Jee-woon",
        genre: ["Thriller", "Crime", "Action"],
        posterImageUrl: "",
        synopsis: "When a secret agent's fiancée is brutally murdered by a serial killer, he captures the man and releases him — only to track him again and again, each time inflicting more pain. Kim Jee-woon's visceral Korean thriller raises a terrible question about revenge: at what point does the pursuit of a monster make you one? A film of extraordinary violence and even more extraordinary moral seriousness.",
    },
    {
        title: "The Chaser",
        year: 2008,
        directedBy: "Na Hong-jin",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "A former detective turned pimp realises his girls are going missing and suspects a client may be responsible. What begins as a mercenary manhunt becomes a race against time as the true nature of the disappearances emerges. Na Hong-jin's debut is relentlessly propulsive Korean crime cinema — a film that turns institutional failure and bureaucratic indifference into instruments of pure horror.",
    },
    {
        title: "Infernal Affairs",
        year: 2002,
        directedBy: "Andrew Lau & Alan Mak",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "A triad mole embedded in the police and a cop embedded in the triads are each tasked with finding the other. Andrew Lau and Alan Mak's Hong Kong thriller — the film that inspired The Departed — is a masterclass in sustained tension, built on the exhausting psychological weight of living as someone you are not. It asks whether a man can outlive the lie he has constructed around himself.",
    },
    {
        title: "Cure",
        year: 1997,
        directedBy: "Kiyoshi Kurosawa",
        genre: ["Thriller", "Horror", "Mystery"],
        posterImageUrl: "",
        synopsis: "A Tokyo detective investigates a series of brutal, seemingly unconnected murders — each committed by a different person, each victim marked with the same X carved into the throat. The only link is a drifting amnesiac with an unsettling gift for conversation. Kiyoshi Kurosawa's masterwork operates not through shocks but through creeping atmospheric dread — a film about suggestion, hypnosis, and the void at the centre of modern identity.",
    },
    {
        title: "Perfect Blue",
        year: 1997,
        directedBy: "Satoshi Kon",
        genre: ["Thriller", "Mystery", "Animation"],
        posterImageUrl: "",
        synopsis: "A Japanese pop idol abandons her music career to pursue acting, only to find her sense of reality unravelling as an obsessive fan begins a harassment campaign and her past persona seems to take on a life of its own. Satoshi Kon's animated psychological thriller is a dazzling meditation on identity, fame, and the dissociation between a performer and their image — a film that disturbs long after it ends.",
    },
    {
        title: "A Bittersweet Life",
        year: 2005,
        directedBy: "Kim Jee-woon",
        genre: ["Thriller", "Crime", "Action"],
        posterImageUrl: "",
        synopsis: "A loyal enforcer for a crime boss is given a simple task: find out if the boss's mistress is having an affair and, if so, eliminate them both. He hesitates — and in that moment of mercy, destroys himself. Kim Jee-woon's sleek Korean neo-noir is a tragedy built on the aesthetics of action cinema: coolly beautiful, brutally precise, and quietly heartbreaking in its portrait of a man who chose loyalty over everything except his own conscience.",
    },
    {
        title: "The Wages of Fear",
        year: 1953,
        directedBy: "Henri-Georges Clouzot",
        genre: ["Thriller", "Drama", "Adventure"],
        posterImageUrl: "",
        synopsis: "Four desperate men stranded in a dead-end South American oil town accept a suicide mission: drive two trucks loaded with highly unstable nitroglycerin across hundreds of miles of treacherous terrain to extinguish an oil well fire. Henri-Georges Clouzot's existentialist thriller is a masterclass in sustained tension — a film about the indignity of poverty, the seduction of risk, and the cruel indifference of capitalism to the lives it consumes.",
    },
    {
        title: "Sorcerer",
        year: 1977,
        directedBy: "William Friedkin",
        genre: ["Thriller", "Drama", "Adventure"],
        posterImageUrl: "",
        synopsis: "Four men fleeing their pasts in different corners of the world end up stranded in a squalid South American village, where they accept a desperate commission: haul trucks of unstable nitroglycerin through jungle and mountain terrain that makes survival a miracle. William Friedkin's reimagining of The Wages of Fear is a hallucinatory descent into physical and moral extremity — one of the great underrated American films of its era.",
    },
    {
        title: "The Night of the Hunter",
        year: 1955,
        directedBy: "Charles Laughton",
        genre: ["Thriller", "Drama", "Film Noir"],
        posterImageUrl: "",
        synopsis: "A self-appointed preacher with LOVE and HATE tattooed on his knuckles marries a widow to get close to her children, who alone know where their executed father hid stolen money. Charles Laughton's only film as director remains one of the most visually extraordinary pictures ever made — a fever-dream of Americana that turns a fairy-tale pursuit into something mythic, deeply strange, and genuinely terrifying.",
    },
    {
        title: "Peeping Tom",
        year: 1960,
        directedBy: "Michael Powell",
        genre: ["Thriller", "Horror", "Drama"],
        posterImageUrl: "",
        synopsis: "A young film technician compulsively films women as he murders them, capturing their terror with a spike concealed in his camera tripod. Michael Powell's scandalous and career-destroying film anticipated the slasher genre by two decades while simultaneously deconstructing the act of watching cinema itself — a haunting, uncomfortable masterwork about the violence latent in the male gaze and the camera that enables it.",
    },
    {
        title: "Don't Look Now",
        year: 1973,
        directedBy: "Nicolas Roeg",
        genre: ["Thriller", "Horror", "Mystery"],
        posterImageUrl: "",
        synopsis: "A grieving couple travel to Venice after the accidental drowning of their young daughter, where the husband begins seeing visions of a small red-coated figure darting through the fog-shrouded streets. Nicolas Roeg's supernatural thriller is a film about grief as much as horror — fragmented, sensory, and building to one of cinema's most genuinely shocking final images.",
    },
    {
        title: "Deliverance",
        year: 1972,
        directedBy: "John Boorman",
        genre: ["Thriller", "Drama", "Adventure"],
        posterImageUrl: "",
        synopsis: "Four suburban men embark on a canoe trip through the untamed Georgian wilderness before a planned dam floods the valley forever. What begins as a test of masculinity becomes a brutal fight for survival. John Boorman's film strips away every comfortable assumption its characters carry into the wild, confronting them — and the audience — with violence that cannot be processed or excused through the usual frameworks.",
    },
    {
        title: "Marathon Man",
        year: 1976,
        directedBy: "John Schlesinger",
        genre: ["Thriller", "Drama", "Crime"],
        posterImageUrl: "",
        synopsis: "A Columbia graduate student is suddenly plunged into a deadly conspiracy involving his intelligence-operative brother, stolen diamonds, and a Nazi war criminal hiding in plain sight in New York. John Schlesinger's paranoid thriller is propelled by one of cinema's most memorably terrifying villains and a sequence in a dentist's chair that has made audiences grip their armrests for five decades.",
    },
    {
        title: "Klute",
        year: 1971,
        directedBy: "Alan J. Pakula",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "A small-town detective comes to New York to investigate the disappearance of a friend and hires a high-end call girl who received threatening letters from the missing man. Alan J. Pakula's melancholy thriller is as much a character study as a procedural — Jane Fonda's portrait of a woman navigating power, exploitation, and self-knowledge is one of the finest performances of 1970s American cinema.",
    },
    {
        title: "The Parallax View",
        year: 1974,
        directedBy: "Alan J. Pakula",
        genre: ["Thriller", "Drama", "Mystery"],
        posterImageUrl: "",
        synopsis: "A journalist investigating the assassination of a senator stumbles onto the trail of a shadowy organisation that recruits and programmes political killers. Alan J. Pakula's second entry in his informal paranoia trilogy is cinema's most formally audacious conspiracy film — culminating in a genuinely unnerving indoctrination sequence and an ending of such bleak finality it still shocks.",
    },
    {
        title: "Three Days of the Condor",
        year: 1975,
        directedBy: "Sydney Pollack",
        genre: ["Thriller", "Drama", "Mystery"],
        posterImageUrl: "",
        synopsis: "A CIA researcher returns from lunch to find everyone in his small New York office murdered. With no idea who is hunting him or why, he goes on the run and begins piecing together a conspiracy that reaches to the highest levels of the agency he trusted. Sydney Pollack's elegant paranoid thriller captures the post-Watergate mood of institutional betrayal with uncommon intelligence and wit.",
    },
    {
        title: "The China Syndrome",
        year: 1979,
        directedBy: "James Bridges",
        genre: ["Thriller", "Drama"],
        posterImageUrl: "",
        synopsis: "A television reporter and her cameraman witness what appears to be a major safety incident at a nuclear power plant, but their footage is confiscated and the story suppressed. James Bridges' prescient thriller — released twelve days before Three Mile Island — remains a forensically detailed and genuinely frightening portrait of corporate cover-up and the cost of speaking truth to power.",
    },
    {
        title: "Body Heat",
        year: 1981,
        directedBy: "Lawrence Kasdan",
        genre: ["Thriller", "Crime", "Romance", "Neo-Noir"],
        posterImageUrl: "",
        synopsis: "In the sweltering Florida heat, a small-time lawyer embarks on a reckless affair with a married woman and allows himself to be drawn into a plan to murder her wealthy husband. Lawrence Kasdan's neo-noir debut is a knowing love letter to Double Indemnity — a film in which desire is indistinguishable from manipulation, and in which every scene carries the prickle of something about to go catastrophically wrong.",
    },
    {
        title: "Manhunter",
        year: 1986,
        directedBy: "Michael Mann",
        genre: ["Thriller", "Crime", "Horror"],
        posterImageUrl: "",
        synopsis: "A retired FBI profiler with an uncanny talent for entering the minds of killers is reluctantly brought back to help catch a serial murderer known as the Tooth Fairy. Michael Mann's original adaptation of Thomas Harris's Red Dragon predates The Silence of the Lambs by five years and remains its superior in formal terms — cold, stylised, and deeply unsettling in its portrait of empathy as a form of self-destruction.",
    },
    {
        title: "The Game",
        year: 1997,
        directedBy: "David Fincher",
        genre: ["Thriller", "Mystery", "Drama"],
        posterImageUrl: "",
        synopsis: "A wealthy, emotionally isolated San Francisco banker is given an unusual birthday present by his brother: participation in a mysterious company's immersive real-world experience designed to alter your life. David Fincher's paranoid puzzle film is a controlled escalation of unreality — a meditation on control, vulnerability, and whether a man can be broken open into something resembling a human being.",
    },
    {
        title: "Gone Girl",
        year: 2014,
        directedBy: "David Fincher",
        genre: ["Thriller", "Mystery", "Drama"],
        posterImageUrl: "",
        synopsis: "On the morning of their fifth wedding anniversary, Amy Dunne disappears and her husband Nick becomes the prime suspect in a national media spectacle. David Fincher's adaptation of Gillian Flynn's novel is a razor-sharp dissection of marriage, performance, and the stories we tell about ourselves — a film that keeps pulling the rug out with escalating, gleeful malice.",
    },
    {
        title: "Shutter Island",
        year: 2010,
        directedBy: "Martin Scorsese",
        genre: ["Thriller", "Mystery", "Drama"],
        posterImageUrl: "",
        synopsis: "In 1954, two US Marshals travel to a remote Massachusetts asylum to investigate the disappearance of a patient. As the investigation deepens, reality begins to dissolve. Martin Scorsese's pulpy, operatic psychological thriller is a grand old-fashioned puzzle film — and a quietly devastating story about the impossible weight of grief and the mind's limitless capacity for self-deception.",
    },
    {
        title: "Prisoners",
        year: 2013,
        directedBy: "Denis Villeneuve",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "Two young girls disappear from a quiet Pennsylvania neighbourhood on Thanksgiving. When the police release the only suspect for lack of evidence, the father of one girl takes the law into his own hands. Denis Villeneuve's moral thriller asks how far a desperate parent will go — and whether the answer diminishes rather than redeems them. Roger Deakins turns the grey American winter into a landscape of pure dread.",
    },
    {
        title: "Nightcrawler",
        year: 2014,
        directedBy: "Dan Gilroy",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "An ambitious young drifter discovers the world of freelance crime journalism — filming accidents and crime scenes at night and selling the footage to local news. Dan Gilroy's portrait of Lou Bloom is one of American cinema's great monsters: a man perfectly shaped by the logic of late capitalism, whose sociopathy the system doesn't just tolerate but actively rewards.",
    },
    {
        title: "Sicario",
        year: 2015,
        directedBy: "Denis Villeneuve",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "An idealistic FBI agent is recruited into a shadowy government task force targeting a powerful Mexican drug cartel. As the mission escalates into morally murky territory, she realises she has been enlisted as a pawn in a strategy whose true objectives she was never told. Denis Villeneuve's film is a devastating portrait of the drug war as institutional corruption — a thriller that refuses to offer moral clarity to its heroine or its audience.",
    },
    {
        title: "Wind River",
        year: 2017,
        directedBy: "Taylor Sheridan",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "A veteran wildlife tracker helps an FBI agent investigate the murder of a young Native American woman on the Wind River Indian Reservation in the dead of a Wyoming winter. Taylor Sheridan's spare, forensically observed thriller is also a film about grief, neglect, and the particular silence that surrounds violence against indigenous women in America — a crime procedural with the soul of an elegy.",
    },
    {
        title: "Collateral",
        year: 2004,
        directedBy: "Michael Mann",
        genre: ["Thriller", "Crime", "Action"],
        posterImageUrl: "",
        synopsis: "A Los Angeles cab driver picks up what appears to be a businessman and drives him through the city's sleek nocturnal geometry — until he discovers his fare is a contract killer with four more targets before dawn. Michael Mann's digital-photography thriller turns Los Angeles into a character in its own right, finding in its cool, inhuman beauty the perfect mirror for a film about professionalism, free will, and the randomness of survival.",
    },
    {
        title: "Heat",
        year: 1995,
        directedBy: "Michael Mann",
        genre: ["Thriller", "Crime", "Action"],
        posterImageUrl: "",
        synopsis: "Two men, perfectly matched and professionally opposed — master thief Neil McCauley and LAPD detective Vincent Hanna — circle each other across the neon-drenched expanse of Los Angeles. Michael Mann's crime epic is built on paradox: these men are more alike than different, yet one must destroy the other. Shot with the precision of the heists it depicts, Heat remains the definitive statement on the romance and cost of living entirely outside the law.",
    },
    {
        title: "Thief",
        year: 1981,
        directedBy: "Michael Mann",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "A professional safecracker operates with self-made precision and dreams of one last big job that will buy him the civilian life he has never been allowed to have. Michael Mann's debut feature established the visual grammar and thematic obsessions that would define his career — a film about the romance of criminal craftsmanship and the systemic forces that make genuine autonomy an illusion for men like its protagonist.",
    },
    {
        title: "The Fugitive",
        year: 1993,
        directedBy: "Andrew Davis",
        genre: ["Thriller", "Crime", "Action"],
        posterImageUrl: "",
        synopsis: "Wrongly convicted of his wife's murder, surgeon Richard Kimble escapes a prison bus crash and goes on the run from a relentless US Marshal while simultaneously investigating the real killer. Andrew Davis's Oscar-winning thriller is a masterclass in narrative economy — sustaining its breathless pace across two hours without a wasted scene, anchored by performances of exceptional intensity from Harrison Ford and Tommy Lee Jones.",
    },
    {
        title: "Mystic River",
        year: 2003,
        directedBy: "Clint Eastwood",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "Three childhood friends from a Boston working-class neighbourhood are reunited when the daughter of one is murdered. As the police investigation tightens, old wounds reopen and buried traumas resurface. Clint Eastwood's tragic thriller is a film about the long shadow that violence casts on the men it touches — grave, formally controlled, and built around three performances that rank among the finest of their decade.",
    },
    {
        title: "L.A. Confidential",
        year: 1997,
        directedBy: "Curtis Hanson",
        genre: ["Thriller", "Crime", "Mystery", "Neo-Noir"],
        posterImageUrl: "",
        synopsis: "Three Los Angeles detectives with wildly different methods and moralities are drawn together by a massacre at an all-night diner, uncovering a conspiracy that reaches to the highest levels of the LAPD. Curtis Hanson's neo-noir is the most perfectly constructed Hollywood thriller of the 1990s — a film that gives you everything the genre promises and then some, in a Los Angeles that gleams like a lie.",
    },
    {
        title: "The Departed",
        year: 2006,
        directedBy: "Martin Scorsese",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "A cop goes undercover in the Irish mob; a mobster goes undercover in the police. Both men are under mortal pressure to expose the other before they are exposed themselves. Martin Scorsese's crime epic is propelled by the unbearable tension of dual infiltration and the question of whether either man has any identity left beyond the performance demanded of him.",
    },
    {
        title: "Miller's Crossing",
        year: 1990,
        directedBy: "Joel Coen & Ethan Coen",
        genre: ["Thriller", "Crime", "Drama", "Neo-Noir"],
        posterImageUrl: "",
        synopsis: "A laconic Irish-American political fixer navigates a brutal mob war between his boss and a rival gangster over the fate of a small-time grifter, while quietly running his own agenda. The Coens' formally austere gangster film draws on Dashiell Hammett's hard-boiled fiction to construct a labyrinthine study of loyalty, betrayal, and the codes men use to hide from their own emotions — one of the most elegantly written crime films ever made.",
    },
    {
        title: "Insomnia",
        year: 1997,
        directedBy: "Erik Skjoldbjærg",
        genre: ["Thriller", "Crime", "Drama", "Mystery"],
        posterImageUrl: "",
        synopsis: "A Norwegian detective travels to a remote Arctic village to investigate a teenage girl's murder during the perpetual daylight of summer, when the sun never sets. As fatigue and a fatal mistake begin to erode his moral certainty, the killer contacts him with a proposition. Erik Skjoldbjærg's original — which Nolan remade five years later — is a claustrophobic, morally precise study in the corrosive effects of guilt and sleeplessness.",
    },
    {
        title: "The Guilty",
        year: 2018,
        directedBy: "Gustav Möller",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "An emergency dispatcher, confined to desk duty following an incident under investigation, receives a distress call from a woman he becomes convinced has been abducted. Told entirely through telephone calls from a single room, Gustav Möller's debut feature is a model of dramatic economy — generating extraordinary tension from the limits of what its protagonist can hear, imagine, and control.",
    },
    {
        title: "Headhunters",
        year: 2011,
        directedBy: "Morten Tyldum",
        genre: ["Thriller", "Crime", "Mystery"],
        posterImageUrl: "",
        synopsis: "Norway's most successful corporate headhunter moonlights as an art thief to fund the lifestyle his self-esteem demands. When he attempts to steal a priceless painting from a dangerously capable man, he triggers a chain of events that quickly escalates far beyond anything he is equipped to survive. Morten Tyldum's jet-black thriller is a brilliantly constructed escalation machine — darkly funny, viscerally tense, and entirely unpredictable.",
    },
    {
        title: "The Invisible Guest",
        year: 2016,
        directedBy: "Oriol Paulo",
        genre: ["Thriller", "Mystery", "Crime"],
        posterImageUrl: "",
        synopsis: "A successful businessman is found locked in a hotel room beside the body of his dead lover, with no apparent way the killer could have entered or escaped. Facing a murder charge, he enlists a celebrated defence lawyer and begins reconstructing the events of that night — each version of the story revealing new layers of deception. Oriol Paulo's Spanish thriller is a puzzle box of exceptional craftsmanship.",
    },
    {
        title: "The Body",
        year: 2012,
        directedBy: "Oriol Paulo",
        genre: ["Thriller", "Mystery", "Crime"],
        posterImageUrl: "",
        synopsis: "A detective is called to investigate the disappearance of a woman's corpse from the morgue — a corpse that, according to the watchman who fled, walked out by itself. Oriol Paulo's debut feature is a tightly coiled mystery that uses its seemingly impossible premise to wrong-foot the audience at every turn, delivering a finale of genuine, ice-cold surprise.",
    },
    {
        title: "Marshland",
        year: 2014,
        directedBy: "Alberto Rodríguez",
        genre: ["Thriller", "Crime", "Mystery"],
        posterImageUrl: "",
        synopsis: "Two detectives with opposing political histories — one a veteran of the Franco era, one a young democratic reformer — investigate the murders of teenage girls in the marshlands of post-dictatorship Andalusia in 1980. Alberto Rodríguez's atmospheric Spanish crime film uses its landscape and period to explore how institutions shaped by violence continue to carry it forward — a literary thriller of great visual and moral intelligence.",
    },
    {
        title: "The Girl with the Dragon Tattoo",
        year: 2011,
        directedBy: "David Fincher",
        genre: ["Thriller", "Crime", "Mystery", "Drama"],
        posterImageUrl: "",
        synopsis: "A disgraced journalist and a brilliant but damaged young hacker are hired to investigate the four-decade-old disappearance of a member of one of Sweden's most powerful families. David Fincher brings his cold precision to Stieg Larsson's source material, transforming a thriller about violence against women into a film about the institutional systems that enable and conceal it — relentlessly controlled and deeply uncomfortable.",
    },
    {
        title: "Eastern Promises",
        year: 2007,
        directedBy: "David Cronenberg",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "A London midwife becomes entangled with the Russian criminal underworld after finding a diary belonging to a teenage girl who died in childbirth. David Cronenberg's film is as much a meditation on identity and penetration as it is a crime thriller — the body, as always in his work, is the site where violence and meaning converge. Viggo Mortensen's performance as a driver whose true allegiances remain radically uncertain is among the finest in recent memory.",
    },
    {
        title: "A History of Violence",
        year: 2005,
        directedBy: "David Cronenberg",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "A mild-mannered small-town diner owner becomes a local hero when he kills two robbers in self-defence — and the attention attracts men from his past who know him by a very different name. David Cronenberg's deceptively simple film is a devastating examination of American mythology: the violence that founds communities, the violence that families require their members to suppress, and what happens when those two things are the same violence.",
    },
    {
        title: "The Killing",
        year: 1956,
        directedBy: "Stanley Kubrick",
        genre: ["Thriller", "Crime", "Film Noir"],
        posterImageUrl: "",
        synopsis: "A recently paroled criminal assembles a team of specialists to rob a racetrack on the day of a major race, with each man playing a timed and coordinated role. Stanley Kubrick's first major film introduced his career-defining formal intelligence — fractured chronology, cool ironic observation, and an inevitability that drains the heist of heroism while making it completely impossible to look away.",
    },
    {
        title: "Rififi",
        year: 1955,
        directedBy: "Jules Dassin",
        genre: ["Thriller", "Crime", "Film Noir"],
        posterImageUrl: "",
        synopsis: "Four men plan and execute the most meticulous jewel robbery in Paris, only to have the aftermath unravel everything the preparation achieved. Jules Dassin's French classic contains one of cinema's greatest sequences — a half-hour heist conducted in complete silence — and remains a masterwork of the genre: precise, elegiac, and merciless in its portrait of how men destroy what they have so carefully built.",
    },
    {
        title: "Elevator to the Gallows",
        year: 1958,
        directedBy: "Louis Malle",
        genre: ["Thriller", "Crime", "Film Noir"],
        posterImageUrl: "",
        synopsis: "A man murders his lover's husband and makes what should be a clean escape — only to become trapped in an elevator after hours, while a teenager steals his car and commits an entirely different crime that will be pinned on him. Louis Malle's debut feature, scored by Miles Davis in a single legendary night session, is a cold equation of bad luck and worse timing — one of the most formally elegant French noirs ever made.",
    },
    {
        title: "Army of Shadows",
        year: 1969,
        directedBy: "Jean-Pierre Melville",
        genre: ["Thriller", "Drama", "War"],
        posterImageUrl: "",
        synopsis: "A French Resistance leader is arrested and escapes, then resumes his clandestine work in the shadow world of occupied France — a world of safe houses, aliases, and the terrible decisions that must be made to keep the network alive. Jean-Pierre Melville's masterwork, based on his own wartime experience, strips the Resistance of its mythology and replaces it with something harder and more truthful: the grey moral weight of survival.",
    },
    {
        title: "The Tenant",
        year: 1976,
        directedBy: "Roman Polanski",
        genre: ["Thriller", "Horror", "Psychological"],
        posterImageUrl: "",
        synopsis: "A meek Polish immigrant rents a Paris apartment from which the previous tenant — a young woman — threw herself from the window. As he settles in, his neighbours begin to treat him in deeply disturbing ways, and he gradually loses his grip on who he is. Polanski's third entry in his informal apartment trilogy is his most openly subjective work — a film in which paranoia and identity dissolution become indistinguishable from each other.",
    },
    {
        title: "Repulsion",
        year: 1965,
        directedBy: "Roman Polanski",
        genre: ["Thriller", "Horror", "Psychological"],
        posterImageUrl: "",
        synopsis: "A young Belgian woman left alone in a London flat for a week begins to hear sounds in the walls, see cracks spreading through the plaster, and experience visions of violent assault. Roman Polanski's first English-language film is a masterclass in subjective horror — a film that traps the audience inside a disintegrating mind and refuses to offer the safety of an external perspective.",
    },
    {
        title: "Eyes Without a Face",
        year: 1960,
        directedBy: "Georges Franju",
        genre: ["Thriller", "Horror", "Drama"],
        posterImageUrl: "",
        synopsis: "A renowned Parisian surgeon, consumed by guilt over a car accident that destroyed his daughter's face, has his devoted assistant abduct young women so that he can attempt a radical face transplant. Georges Franju's poetic horror film is unlike any other — languid, mournful, and strangely beautiful in its imagery, transforming a story of monstrous obsession into something closer to a tragic fable about the limits of love.",
    },
    {
        title: "Misery",
        year: 1990,
        directedBy: "Rob Reiner",
        genre: ["Thriller", "Drama", "Horror"],
        posterImageUrl: "",
        synopsis: "A bestselling novelist survives a car crash in a blizzard and wakes in the isolated home of his self-described number-one fan — who has read the manuscript of his new novel and did not like what he did to her favourite character. Rob Reiner's adaptation of Stephen King is the definitive star-vehicle thriller: a two-hander that builds its dread from domestic confinement and a terrifying, Oscar-winning Kathy Bates.",
    },
    {
        title: "Cape Fear",
        year: 1991,
        directedBy: "Martin Scorsese",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "A convicted rapist, released after fourteen years, returns to terrorise the attorney whose deliberately inadequate defence helped ensure his conviction. Martin Scorsese's lurid, operatic remake is a deliberate exercise in excess — a film about guilt, complicity, and the question of what a man will do to protect his family when he cannot claim the moral high ground.",
    },
    {
        title: "Wait Until Dark",
        year: 1967,
        directedBy: "Terence Young",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "A recently blinded woman is left alone in her New York apartment, in possession of a doll stuffed with heroin she doesn't know she has, while three increasingly desperate criminals close in to retrieve it. Terence Young's stage-to-screen thriller is a masterwork of situational tension — methodically stripping away every advantage from its heroine until the lights go out and the most vulnerable person in the room becomes the most dangerous.",
    },
    {
        title: "The Spy Who Came in from the Cold",
        year: 1965,
        directedBy: "Martin Ritt",
        genre: ["Thriller", "Drama", "Espionage"],
        posterImageUrl: "",
        synopsis: "A burnt-out British intelligence officer is given one final mission: travel to East Germany posing as a defector and destroy the career of the Abteilung's most effective officer. Martin Ritt's adaptation of John le Carré's novel is the definitive antidote to James Bond — a spy film of grinding moral ambiguity in which the Cold War's ideological distinctions are revealed as a convenience concealing mutual corruption.",
    },
    {
        title: "Tinker Tailor Soldier Spy",
        year: 2011,
        directedBy: "Tomas Alfredson",
        genre: ["Thriller", "Drama", "Espionage", "Mystery"],
        posterImageUrl: "",
        synopsis: "Retired intelligence officer George Smiley is brought back to identify a Soviet mole at the highest levels of British intelligence. Tomas Alfredson's adaptation of le Carré's landmark novel is a masterpiece of omission — told in silences, glances, and the accumulated weight of institutional memory, in which espionage is revealed as a system built on betrayal, and loyalty as its most costly illusion.",
    },
    {
        title: "Rope",
        year: 1948,
        directedBy: "Alfred Hitchcock",
        genre: ["Thriller", "Crime", "Drama"],
        posterImageUrl: "",
        synopsis: "Two young men strangle a former classmate for sport and then host a dinner party, serving the food from the chest in which they have hidden the body, while their former housemaster grows suspicious. Hitchcock's one-take experiment is as much a philosophical provocation as a thriller — a film about the distance between a dangerous idea and the horror of its consequences, staged with cold formal audacity.",
    },
];
// ─── Seed Logic ───────────────────────────────────────────────────────────────
async function main() {
    const readyMovies = THRILLER_MOVIES.filter((m) => m.synopsis.trim() !== "");
    const pendingMovies = THRILLER_MOVIES.filter((m) => m.synopsis.trim() === "");
    console.log(`\nTheCinePrism — Thriller Seed`);
    console.log(`Total:   ${THRILLER_MOVIES.length}`);
    console.log(`Ready:   ${readyMovies.length}`);
    console.log(`Pending: ${pendingMovies.length} (no synopsis yet)\n`);
    if (readyMovies.length === 0) {
        console.log("No movies ready to insert. Fill in synopsis fields first.");
        return;
    }
    let inserted = 0;
    let skipped = 0;
    let errors = 0;
    for (const movie of readyMovies) {
        console.log(`\n→ ${movie.title} (${movie.year})`);
        try {
            const existing = await prisma.byGenres.findFirst({
                where: { title: movie.title, year: movie.year },
                select: { id: true, genre: true },
            });
            if (existing) {
                // Check if all our desired genres are already present
                const missingGenres = movie.genre.filter((g) => !existing.genre.includes(g));
                if (missingGenres.length === 0) {
                    console.log(`  ⏭  Already in DB with correct genres — skipping`);
                    skipped++;
                }
                else {
                    // Merge genres: keep existing ones and add missing ones
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
            // Auto-fetch poster from TMDB and upload to S3 if not provided
            let posterUrl = movie.posterImageUrl;
            if (!posterUrl) {
                posterUrl = await fetchAndUploadPoster(movie.title, movie.year);
                // Small delay to stay within TMDB rate limits (40 req/10s)
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
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped:  ${skipped} (already in DB)`);
    if (errors > 0)
        console.log(`Errors:   ${errors}`);
    console.log(`─────────────────────────────────────────\n`);
    if (pendingMovies.length > 0) {
        console.log(`Still needs synopsis (${pendingMovies.length}):`);
        pendingMovies.forEach((m, i) => console.log(`  ${String(i + 1).padStart(2, " ")}. ${m.title} (${m.year})`));
        console.log();
    }
}
main()
    .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
