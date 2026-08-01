import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";
import * as dns from "dns";
import axios from "axios";
import { Upload } from "@aws-sdk/lib-storage";
import { s3Client, BUCKET_NAME } from "../config/aws";

// Force IPv4 — prevents ETIMEDOUT on networks where IPv6 routes to TMDB fail
dns.setDefaultResultOrder("ipv4first");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function fetchAndUploadPoster(title: string, year: number): Promise<string> {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) throw new Error("TMDB_API_KEY not set in .env");

  const searchRes = await axios.get("https://api.themoviedb.org/3/search/movie", {
    params: { api_key: TMDB_API_KEY, query: title, year, language: "en-US" },
  });

  const result = searchRes.data.results?.[0];
  if (!result?.poster_path) {
    console.log(`     ⚠  No TMDB poster found for "${title}" (${year})`);
    return "";
  }

  const tmdbPosterUrl = `https://image.tmdb.org/t/p/w500${result.poster_path}`;
  const imageRes = await axios.get(tmdbPosterUrl, { responseType: "arraybuffer" });
  const buffer = Buffer.from(imageRes.data);

  const key = `by-genres/${crypto.randomUUID()}.jpg`;
  const upload = new Upload({
    client: s3Client,
    params: { Bucket: BUCKET_NAME, Key: key, Body: buffer, ContentType: "image/jpeg" },
  });

  await upload.done();

  const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  console.log(`     🎬  TMDB poster uploaded → S3`);
  return s3Url;
}

interface DramaMovie {
  title: string;
  year: number;
  directedBy: string;
  genre: string[];
  posterImageUrl: string;
  synopsis: string;
}

const DRAMA_MOVIES: DramaMovie[] = [
  {
    title: "Tokyo Story",
    year: 1953,
    directedBy: "Yasujirō Ozu",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "An elderly couple from provincial Japan travel to Tokyo to visit their grown children, who are too busy with their own lives to pay them much attention. Only their widowed daughter-in-law treats them with warmth. Yasujirō Ozu's masterpiece is perhaps the most quietly devastating film ever made — a study in filial ingratitude and the passage of time that operates without melodrama, observing human disappointment with such compassionate precision that watching it feels less like cinema than lived experience.",
  },
  {
    title: "The Rules of the Game",
    year: 1939,
    directedBy: "Jean Renoir",
    genre: ["Drama", "Comedy"],
    posterImageUrl: "",
    synopsis: "A weekend hunting party at a French country estate brings together aristocrats and servants, lovers and their spouses, in a series of shifting alliances and collisions that end in accidental death. Jean Renoir's pre-war masterpiece is a vision of a civilisation sleepwalking toward catastrophe — a film that uses the conventions of bourgeois comedy to deliver a verdict of extraordinary moral precision on a society unwilling to face its own contradictions.",
  },
  {
    title: "Late Spring",
    year: 1949,
    directedBy: "Yasujirō Ozu",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A widowed professor lives contentedly with his devoted daughter, who has no wish to leave home and marry. Gently, reluctantly, he engineers her departure by pretending he plans to remarry. Yasujirō Ozu's Late Spring is a film of aching subtlety — a study in parental sacrifice enacted through small gestures, suppressed emotions, and the unbearable weight of a smile maintained at precisely the wrong moment.",
  },
  {
    title: "The Passion of Joan of Arc",
    year: 1928,
    directedBy: "Carl Theodor Dreyer",
    genre: ["Drama", "Historical"],
    posterImageUrl: "",
    synopsis: "Based entirely on the trial transcripts, Carl Theodor Dreyer's silent masterpiece compresses the interrogation and execution of Joan of Arc into a single day, shot almost entirely in extreme close-up. The camera studies Maria Falconetti's face with the sustained intensity of a confession — a performance of such harrowing interiority that it remains, nearly a century later, the most devastating portrayal of spiritual conviction and institutional cruelty in cinema.",
  },
  {
    title: "Ikiru",
    year: 1952,
    directedBy: "Akira Kurosawa",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A low-level bureaucrat discovers he has terminal stomach cancer and, after decades of meaningless paper-pushing, must figure out how to spend the time he has left. Akira Kurosawa's most humanist film follows a man trying to accomplish one small, real thing before he dies — a modest park built in place of a fetid wasteground — and finds in that modest ambition something close to redemption. The final scene, a man on a swing in the snow, is among the most quietly transcendent images in cinema.",
  },
  {
    title: "The Apu Trilogy",
    year: 1955,
    directedBy: "Satyajit Ray",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "Across three films — Pather Panchali, Aparajito, and Apur Sansar — Satyajit Ray traces the life of Apu from impoverished Bengali childhood through his mother's death, his own faltering education, and the shattering grief of sudden widowhood. Drawn from Bibhutibhushan Bandopadhyay's novels and shot in a style that fused Italian neorealism with the rhythms of Indian classical music, the trilogy remains the greatest achievement of Indian cinema — a chronicle of poverty and aspiration rendered with extraordinary tenderness and unflinching honesty.",
  },
  {
    title: "Bicycle Thieves",
    year: 1948,
    directedBy: "Vittorio De Sica",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A Roman worker desperate for employment finally lands a job that requires a bicycle, only to have it stolen on his first day. With his young son beside him, he searches the vast city of postwar Rome for the one stolen bicycle that represents everything. Vittorio De Sica's neorealist landmark uses non-professional actors and actual Roman locations to achieve something simultaneously documentary and mythic — a fable about poverty, dignity, and the particular cruelty of a world indifferent to individual suffering.",
  },
  {
    title: "Umberto D.",
    year: 1952,
    directedBy: "Vittorio De Sica",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "An elderly retired civil servant struggles to survive in postwar Rome on an inadequate pension, facing eviction while protecting his small dog. Vittorio De Sica and screenwriter Cesare Zavattini strip their film to the absolute essentials of one man's existence — his dignity, his dog, his room — and construct from these humble materials one of the most painful films ever made about old age and institutional abandonment.",
  },
  {
    title: "Au Hasard Balthazar",
    year: 1966,
    directedBy: "Robert Bresson",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A donkey named Balthazar passes from owner to owner through the cruelties and occasional kindnesses of the world, his face registering everything and explaining nothing. Robert Bresson's most demanding film refuses the consolations of narrative logic or moral resolution — it proceeds with the systematic precision of a saint's life, finding in Balthazar's passive suffering an image of grace so oblique and so complete that the final scene, the donkey dying among a flock of sheep on a hillside, remains inexhaustible.",
  },
  {
    title: "The Leopard",
    year: 1963,
    directedBy: "Luchino Visconti",
    genre: ["Drama", "Historical", "Romance"],
    posterImageUrl: "",
    synopsis: "An aging Sicilian prince watches the Risorgimento transform the social order that has sustained his family for centuries, understanding that his class must accommodate itself to change or be obliterated. Luchino Visconti's adaptation of Giuseppe Tomasi di Lampedusa's novel is one of cinema's grandest frescoes — sumptuous, elegiac, and politically precise, reaching its summit in a forty-minute ballroom sequence of almost unbearable beauty and sadness.",
  },
  {
    title: "Yi Yi",
    year: 2000,
    directedBy: "Edward Yang",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "Over the course of a year, a Taipei family navigates a series of overlapping crises: a new marriage, a dying grandmother, a father's temptation, a boy's dawning consciousness of the world. Edward Yang's three-hour masterpiece observes contemporary urban life with the patience and precision of a great novel — a film about the things we cannot say to one another and the images, like photographs taken of what we cannot see from the front, that might articulate them.",
  },
  {
    title: "A Separation",
    year: 2011,
    directedBy: "Asghar Farhadi",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A middle-class Tehran couple decides to separate after the wife's desire to emigrate conflicts with the husband's refusal to leave his Alzheimer's-afflicted father. When a caretaker hired to help with the father is involved in a disputed incident, a moral labyrinth opens that implicates every character in ways that resist simple verdict. Asghar Farhadi's masterwork uses the grammar of a courtroom thriller to conduct one of cinema's most rigorous moral investigations — a film in which everyone is both right and wrong.",
  },
  {
    title: "Still Walking",
    year: 2008,
    directedBy: "Hirokazu Kore-eda",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A family gathers at the parental home for an annual day marking the drowning death of an older son years earlier. Small tensions accumulate over meals, preparations, and conversations half-said and half-heard. Hirokazu Kore-eda's film is so precise in its observation of how families absorb and deflect grief that it seems less like a movie than a recording of something that actually happened — each small cruelty and small tenderness weighted with the knowledge that the day will pass and nothing will be resolved.",
  },
  {
    title: "The Tree of Life",
    year: 2011,
    directedBy: "Terrence Malick",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A Texas family in the 1950s — a strict father, a gentle mother, three boys growing toward consciousness — is set against nothing less than the origin of the universe. Terrence Malick's most audacious film asks how grace and nature coexist in a single human life, and answers with twenty minutes of cosmic imagery, a stunning portrait of a 1950s Texas childhood, and Sean Penn standing in a kind of afterlife. Nothing else in cinema is quite like it.",
  },
  {
    title: "Wild Strawberries",
    year: 1957,
    directedBy: "Ingmar Bergman",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "An elderly professor drives to receive an honorary degree while revisiting, in memories and dreams, the emotional failures and missed chances of his long life. Ingmar Bergman's most approachable film remains one of the most humane — a meditation on regret and the possibility of late recognition that finds, in the face of Victor Sjöström, a performance of almost uncanny depth and age.",
  },
  {
    title: "Fanny and Alexander",
    year: 1982,
    directedBy: "Ingmar Bergman",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A prosperous Swedish theatrical family at the turn of the twentieth century is thrown into darkness when the children's widowed mother marries a severe bishop. Ingmar Bergman's final theatrical film is a summation — his most expansive, most forgiving work, moving between warmth and terror with the confidence of an artist who knows he has said everything he set out to say and is saying it one last time, as a gift.",
  },
  {
    title: "Scenes from a Marriage",
    year: 1973,
    directedBy: "Ingmar Bergman",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "Originally a television series distilled into a theatrical film, Scenes from a Marriage traces a Swedish couple through the dissolution of their ten-year marriage across a decade of collisions, confessions, and attempts at repair. Ingmar Bergman's most brutally intimate work strips every social performance away from love and asks what, if anything, remains — the answer Liv Ullmann and Erland Josephson give is both agonising and strangely hopeful.",
  },
  {
    title: "Cries and Whispers",
    year: 1972,
    directedBy: "Ingmar Bergman",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "Three sisters gather in the family home as the eldest is dying of cancer. What emerges is less a narrative of illness than an excavation of the emotional distances women maintain from one another — the capacity for tenderness and the failures of love exposed in the red chambers of a dying woman's last weeks. Ingmar Bergman's most formally severe film, shot in saturated reds and whites that feel less like cinematography than physiology.",
  },
  {
    title: "Persona",
    year: 1966,
    directedBy: "Ingmar Bergman",
    genre: ["Drama", "Psychological"],
    posterImageUrl: "",
    synopsis: "A famous actress stops speaking for reasons no one can determine, and a nurse is assigned to care for her at a remote seaside cottage. As the two women live together, their identities begin to merge in ways that destabilise the film's formal coherence along with its characters' subjectivities. Ingmar Bergman's most radical work operates where cinema, psychology, and philosophy converge — a film that remains genuinely unsettling precisely because it offers no ground to stand on.",
  },
  {
    title: "The Seventh Seal",
    year: 1957,
    directedBy: "Ingmar Bergman",
    genre: ["Drama", "Fantasy", "Historical"],
    posterImageUrl: "",
    synopsis: "A medieval knight, returning from the Crusades to find Sweden ravaged by plague, plays chess with Death to buy time while searching for some evidence of God's existence. Ingmar Bergman's most allegorical film is also his most visually iconic — a work of theatrical darkness and intellectual severity that, in its final caravan of souls and its knight's last act of decency, achieves something close to grace.",
  },
  {
    title: "Andrei Rublev",
    year: 1966,
    directedBy: "Andrei Tarkovsky",
    genre: ["Drama", "Historical"],
    posterImageUrl: "",
    synopsis: "A series of episodes from the life of the 15th-century icon painter Andrei Rublev, set against a landscape of medieval Russian violence, pagan ritual, Tartar invasion, and religious uncertainty. Andrei Tarkovsky's three-hour epic is not a conventional biography but a meditation on the relationship between faith, artistic creation, and suffering — culminating in the casting of a great bell and, for the first time, the revelation of Rublev's icons in colour.",
  },
  {
    title: "Mirror",
    year: 1975,
    directedBy: "Andrei Tarkovsky",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A dying man recalls fragments of memory: his childhood dacha, his mother, wartime newsreels, the texture of wet grass and wind in a field. Andrei Tarkovsky's most autobiographical film refuses linear chronology and psychological explanation — it proceeds by image and sensation, like memory itself, dissolving past and present into a stream of recollection whose cumulative force is devastating precisely because it cannot be reduced to meaning.",
  },
  {
    title: "The Sacrifice",
    year: 1986,
    directedBy: "Andrei Tarkovsky",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "On his birthday, a man receives news of nuclear war. He makes a bargain with God: if the catastrophe is averted, he will sacrifice everything he has — his home, his family, his voice — and never speak again. Andrei Tarkovsky's final film, made while he was dying of cancer, is a meditation on faith, responsibility, and what it would mean to truly give something up — ending in one of cinema's most extraordinary single-take sequences of destruction and sacrifice.",
  },
  {
    title: "Dekalog",
    year: 1989,
    directedBy: "Krzysztof Kieślowski",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "Ten one-hour films, loosely based on the Ten Commandments and all set in a Warsaw housing estate, examine the moral entanglements of ordinary life: love, murder, inheritance, faith, jealousy, medical ethics, and the boundaries of forgiveness. Krzysztof Kieślowski's masterwork is the most comprehensive moral vision in television history — a series that treats each of its characters with equal seriousness, refusing easy verdicts while insisting that how we live with one another matters absolutely.",
  },
  {
    title: "Three Colours: Blue",
    year: 1993,
    directedBy: "Krzysztof Kieślowski",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "A woman survives a car crash that kills her husband and daughter and decides to live entirely alone, without attachment, without memory, without grief. Krzysztof Kieślowski's study of liberty — the first film in his trilogy of French revolutionary ideals — tracks the impossibility of that project: grief seeps back, connection reasserts itself, and what she discovers in the attempt to feel nothing is the intractable weight of everything.",
  },
  {
    title: "Three Colours: Red",
    year: 1994,
    directedBy: "Krzysztof Kieślowski",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "A young Geneva model discovers her elderly neighbour has been illegally wiretapping his neighbours' telephone calls, and a strange friendship develops across an impossible age gap. Krzysztof Kieślowski's final film is a meditation on fraternity — on the coincidences, near-misses, and hidden connections between lives that might never intersect, arriving at an ending of quiet, devastating beauty.",
  },
  {
    title: "The Double Life of Veronique",
    year: 1991,
    directedBy: "Krzysztof Kieślowski",
    genre: ["Drama", "Romance", "Mystery"],
    posterImageUrl: "",
    synopsis: "Two women — one Polish, one French — share an identical appearance, an identical voice, and an identical gift for music, without knowing of each other's existence. When one dies, the other feels an inexplicable grief and begins searching for what she has lost. Kieślowski's most mysterious film is the least explicable of his great works — a film about intuition, spiritual connection, and the sense that one's life rhymes with something one cannot name.",
  },
  {
    title: "The Lives of Others",
    year: 2006,
    directedBy: "Florian Henckel von Donnersmarck",
    genre: ["Drama", "Thriller", "Historical"],
    posterImageUrl: "",
    synopsis: "An East German Stasi officer assigned to surveil a playwright and his actress girlfriend gradually becomes invested in the lives he is supposed to be destroying. Florian Henckel von Donnersmarck's debut is a portrait of a system designed to erase human interiority — and of one man's quiet, dangerous decision to allow himself to feel something. The film's final line, spoken in a bookshop, is one of cinema's most moving conclusions.",
  },
  {
    title: "Amour",
    year: 2012,
    directedBy: "Michael Haneke",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "An elderly Parisian couple — both retired music teachers — face the gradual physical deterioration of the wife following a series of strokes. Her husband tends to her with love, patience, and a grief too enormous to articulate, as their apartment becomes the whole world. Michael Haneke's most tender film is also his most brutal — a film about love as an act of witness, and about the merciless logic of the body that eventually defeats all devotion.",
  },
  {
    title: "The White Ribbon",
    year: 2009,
    directedBy: "Michael Haneke",
    genre: ["Drama", "Mystery", "Historical"],
    posterImageUrl: "",
    synopsis: "A series of mysterious and violent incidents disturbs the rigid social order of a Protestant German village in the years before the First World War. Haneke shoots in a black and white of severe beauty, maintaining a documentary distance from events that refuses interpretation — we understand that we are watching the formation of a generation, and what that generation would become, without being told.",
  },
  {
    title: "Paris, Texas",
    year: 1984,
    directedBy: "Wim Wenders",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A man is discovered wandering mute and amnesiac in the Texas desert. Slowly, painstakingly, he is reunited with his brother and his young son, and begins piecing together the shattered life that preceded his disappearance. Wim Wenders' meditation on the American landscape and its emotional geography traces the journey of a man reconstructing himself from fragments — building toward a scene in a peep-show booth that is one of cinema's most heartbreaking acts of long-distance love.",
  },
  {
    title: "Wings of Desire",
    year: 1987,
    directedBy: "Wim Wenders",
    genre: ["Drama", "Fantasy", "Romance"],
    posterImageUrl: "",
    synopsis: "An angel who has watched over humanity since the beginning of time decides to become mortal after falling in love with a trapeze artist in divided Berlin. Wim Wenders' film uses the split city as a metaphor for the division between spirit and flesh, memory and sensation — shot in black and white for the angels, colour for the living, in a film of extraordinary lyrical beauty about what it means to choose finitude.",
  },
  {
    title: "The Marriage of Maria Braun",
    year: 1979,
    directedBy: "Rainer Werner Fassbinder",
    genre: ["Drama", "Historical", "Romance"],
    posterImageUrl: "",
    synopsis: "A German woman separated from her husband by the war builds an independent life through calculated self-reinvention, using men as resources while keeping her real self in reserve for the husband she is certain will return. Rainer Werner Fassbinder's portrait of West Germany's economic miracle through the body and choices of one woman is a film of ferocious intelligence — a love story, a political allegory, and an anatomy of what survival costs.",
  },
  {
    title: "Ali: Fear Eats the Soul",
    year: 1974,
    directedBy: "Rainer Werner Fassbinder",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "A 60-year-old German cleaning woman falls in love with a 40-year-old Moroccan guest worker and they marry, to the horror of her family, neighbours, and colleagues. Rainer Werner Fassbinder's reimagining of Douglas Sirk's All That Heaven Allows strips the melodrama's excess to expose the social mechanisms of racist hostility — a film of enormous tenderness and fury, made in fifteen days, that has never dated.",
  },
  {
    title: "Raging Bull",
    year: 1980,
    directedBy: "Martin Scorsese",
    genre: ["Drama", "Sports", "Biographical"],
    posterImageUrl: "",
    synopsis: "The rise and self-destruction of middleweight boxing champion Jake LaMotta, driven by jealousy, violence, and an inability to metabolise his own appetites. Martin Scorsese's film, shot in black and white, is less a boxing film than a study in masculine self-immolation — a portrait of a man who can only relate to the world through the violence he brings to it. Robert De Niro's performance remains among the most total transformations in screen acting.",
  },
  {
    title: "The Age of Innocence",
    year: 1993,
    directedBy: "Martin Scorsese",
    genre: ["Drama", "Romance", "Historical"],
    posterImageUrl: "",
    synopsis: "A young New York lawyer engaged to a suitable woman of his social circle becomes obsessed with her unconventional cousin, returned from Europe under a cloud of scandal. Martin Scorsese's adaptation of Edith Wharton is his most formally contained film — a study of a suffocating social world in which what is not said, not done, and not permitted constitutes the real action, and in which desire is crushed by the weight of invisible convention.",
  },
  {
    title: "There Will Be Blood",
    year: 2007,
    directedBy: "Paul Thomas Anderson",
    genre: ["Drama", "Historical"],
    posterImageUrl: "",
    synopsis: "A silver miner turned oil prospector builds an empire in Southern California at the turn of the twentieth century, destroying everything in his path with single-minded ferocity. Paul Thomas Anderson's film is an origin story of American capitalism, watched through the prism of one man's total severance from human connection — culminating in Daniel Day-Lewis' operatic final scene, which strips the mythology of the self-made man down to its murderous core.",
  },
  {
    title: "Magnolia",
    year: 1999,
    directedBy: "Paul Thomas Anderson",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "Nine interconnected stories unfold over a single day in the San Fernando Valley: a dying television producer, a quiz kid haunted by his past, a police officer falling in love, a motivational speaker, a dying former quiz champion. Paul Thomas Anderson's three-hour mosaic is a film about damage passed from parent to child, about forgiveness and its impossibility, and about coincidence as a kind of grace — culminating in one of cinema's most audacious and inexplicable images.",
  },
  {
    title: "The Master",
    year: 2012,
    directedBy: "Paul Thomas Anderson",
    genre: ["Drama", "Historical", "Psychological"],
    posterImageUrl: "",
    synopsis: "A drifting, alcoholic former sailor falls into the orbit of a charismatic religious leader who runs a cult-like philosophical movement called The Cause. Paul Thomas Anderson's most formally perfect film uses the relationship between its two men — Joaquin Phoenix's feral, unresolvable animal energy and Philip Seymour Hoffman's magnificent, manipulative certainty — to examine the human need for meaning and the danger of those who offer it.",
  },
  {
    title: "Manchester by the Sea",
    year: 2016,
    directedBy: "Kenneth Lonergan",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A reclusive Boston janitor is appointed guardian of his teenage nephew following his brother's sudden death, requiring him to return to the coastal town where he suffered a catastrophic loss years before. Kenneth Lonergan's film is a study in the kind of grief that does not resolve — grief that simply occupies the space where a person used to be, resistant to all the social scripts for recovery. Casey Affleck's performance is the quietest devastation in recent American cinema.",
  },
  {
    title: "Moonlight",
    year: 2016,
    directedBy: "Barry Jenkins",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "A young Black man in Liberty City, Miami grows from childhood through adolescence to adulthood, finding his identity in relation to a violent home environment, a drug-addicted mother, a drug dealer who becomes a surrogate father, and a single experience of intimacy that will define him. Barry Jenkins' triptych is a film of extraordinary sensory delicacy — shot in deep, shimmering colour, scored with music of unexpected range — that traces the architecture of a life built around what must be hidden.",
  },
  {
    title: "Boyhood",
    year: 2014,
    directedBy: "Richard Linklater",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A boy is followed from age six to age eighteen over twelve years of actual filming, growing up before our eyes with the same cast as his parents and sister against the changing landscape of American life. Richard Linklater's experiment in real time is less interested in dramatic incident than in the texture of growing up — the accumulation of small moments, awkward conversations, and passing years that constitute a life in the making.",
  },
  {
    title: "The Remains of the Day",
    year: 1993,
    directedBy: "James Ivory",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "An emotionally repressed English butler, driving across England to visit a former housekeeper, reflects on decades of service to a fascist-sympathising lord — and on the love he suppressed in the name of professional dignity. James Ivory's adaptation of Kazuo Ishiguro's novel is a film about the cost of perfect service: the self systematically evacuated in the name of an ideal, and the love that dies in the silence left behind.",
  },
  {
    title: "Brief Encounter",
    year: 1945,
    directedBy: "David Lean",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "A middle-class married woman and a married doctor meet weekly at a railway station and fall into a love they know they cannot act upon. David Lean's adaptation of Noël Coward's play captures, with remarkable restraint, the full register of feeling that courses beneath the surface of English respectability — an affair conducted almost entirely in suppressed gesture and interrupted thought, whose renunciation contains more feeling than most scenes of consummation.",
  },
  {
    title: "The Grapes of Wrath",
    year: 1940,
    directedBy: "John Ford",
    genre: ["Drama", "Historical"],
    posterImageUrl: "",
    synopsis: "The Joad family, driven from their Oklahoma farm by the Dust Bowl and bank foreclosure, travel Route 66 to California in search of work and dignity. John Ford's adaptation of John Steinbeck's novel balances documentary realism with an almost mythic sense of American working-class endurance — anchored by Henry Fonda's performance as Tom Joad and Jane Darwell's Oscar-winning Ma Joad, whose final speech about the people going on is American cinema's most political monologue.",
  },
  {
    title: "On the Waterfront",
    year: 1954,
    directedBy: "Elia Kazan",
    genre: ["Drama", "Crime"],
    posterImageUrl: "",
    synopsis: "A former prizefighter working as a longshoreman on the New Jersey docks is pressured to remain silent about corruption, while his conscience, his faith, and his love for a murdered man's sister pull him toward testimony. Elia Kazan's film remains a masterwork of location filmmaking and performance — Marlon Brando's taxi-cab scene is the beginning of modern screen acting.",
  },
  {
    title: "A Streetcar Named Desire",
    year: 1951,
    directedBy: "Elia Kazan",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A faded Southern belle arrives at her sister's cramped New Orleans apartment to find salvation, and instead finds her fantasies systematically dismantled by her brutish brother-in-law. Elia Kazan's adaptation of Tennessee Williams is a film of violent psychological intensity, built on the dynamic tension between Marlon Brando's Stanley Kowalski and Vivien Leigh's Blanche DuBois — a clash between two mythologies of the American South in which both combatants are finally destroyed.",
  },
  {
    title: "All About Eve",
    year: 1950,
    directedBy: "Joseph L. Mankiewicz",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A veteran Broadway actress gradually realises that the seemingly naive young fan she has taken under her wing is systematically dismantling her career and her life. Joseph L. Mankiewicz's witheringly intelligent drama is the most perfectly written film about ambition, theatre, and the relationship between performance and identity — a film that turns every scene into a small trap that its audience steps into with delight.",
  },
  {
    title: "12 Angry Men",
    year: 1957,
    directedBy: "Sidney Lumet",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "Eleven jurors are certain of a boy's guilt in a murder case; the twelfth has doubts. Over the course of a sweltering afternoon in a jury room, the lone dissenter systematically dismantles the other men's certainty — not just about the case but about themselves. Sidney Lumet's debut is a model of theatrical film adaptation: finding in the claustrophobia of a single room an increasingly precise and unsettling portrait of prejudice, class, and the fragility of reason.",
  },
  {
    title: "Ordinary People",
    year: 1980,
    directedBy: "Robert Redford",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A privileged Chicago family is coming apart after the death of one son in a boating accident and the subsequent suicide attempt of the surviving son. Robert Redford's debut as director is a scrupulous portrait of upper-middle-class emotional dysfunction — the mechanisms by which a family maintains surface cohesion while its members drown separately, and what happens when one of them finally breaks the surface.",
  },
  {
    title: "Kramer vs. Kramer",
    year: 1979,
    directedBy: "Robert Benton",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "An advertising executive is abandoned by his wife and must learn to care for their seven-year-old son, just as his career is stalling, before she returns and contests custody. Robert Benton's film refuses to make a villain of either parent, tracing with uncommon fairness the competing claims of two people trying to build identities in the ruins of a marriage — anchored by performances from Dustin Hoffman and Meryl Streep of devastating precision.",
  },
  {
    title: "Terms of Endearment",
    year: 1983,
    directedBy: "James L. Brooks",
    genre: ["Drama", "Comedy"],
    posterImageUrl: "",
    synopsis: "A mother and daughter negotiate a love as thorny as it is indestructible over several decades — the daughter's unhappy marriage, the mother's late-life romance with an astronaut next door, and the illness that finally resolves everything between them. James L. Brooks' film moves between comedy and grief with such ease that the tonal shifts feel less like craft than life — and the scenes of the daughter's final days in hospital achieve an emotional directness that almost no other American film has equalled.",
  },
  {
    title: "The Deer Hunter",
    year: 1978,
    directedBy: "Michael Cimino",
    genre: ["Drama", "War"],
    posterImageUrl: "",
    synopsis: "Three working-class friends from a Pennsylvania steel town go to fight in Vietnam and are captured, forced to play Russian roulette by their captors. Michael Cimino's three-hour epic uses its length to build the texture of a world so fully that when it is destroyed, the audience feels the loss as a personal bereavement. The Russian roulette scenes, unbearable and indelible, transformed American cinema's understanding of what war films could do.",
  },
  {
    title: "The Last Picture Show",
    year: 1971,
    directedBy: "Peter Bogdanovich",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "Teenagers coming of age in a dying Texas small town in the early 1950s navigate sex, loneliness, and the departure of everything that might have made life meaningful. Peter Bogdanovich's film, shot in deliberate black-and-white homage to the directors he revered, is a masterwork of American provincial melancholy — an elegy for a time and place whose beauty and poverty are inseparable from each other.",
  },
  {
    title: "Days of Heaven",
    year: 1978,
    directedBy: "Terrence Malick",
    genre: ["Drama", "Romance", "Historical"],
    posterImageUrl: "",
    synopsis: "Two Texas steel workers — a man and his girlfriend, passing as brother and sister — work the wheat harvest in the Texas Panhandle, where the girlfriend is courted by the wealthy farmer who owns the land. Terrence Malick's second feature is less a drama than a sustained visual experience — filmed during the golden hour by Nestor Almendros in images of extraordinary beauty, narrated by a child whose understanding of the events she witnessed remains partial and haunting.",
  },
  {
    title: "A Woman Under the Influence",
    year: 1974,
    directedBy: "John Cassavetes",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A working-class Los Angeles woman is unable to contain the force of her own personality within the role of wife and mother, and her husband — who loves her desperately and cannot understand her — has her committed. John Cassavetes' film, shot on 16mm with natural performances, is an act of total immersion in one woman's crisis — a portrait of institutional normalisation so uncomfortable that watching it feels like a violation of privacy.",
  },
  {
    title: "Opening Night",
    year: 1977,
    directedBy: "John Cassavetes",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A famous Broadway actress, shaken by a fan's death outside a theatre, finds herself unable to perform the role she is opening in — a woman facing middle age — because she refuses to accept what the play is asking of her. John Cassavetes' film watches Gena Rowlands dismantling a performance from the inside, collapsing the line between actress and character and between art and psychological breakdown in ways that leave the audience uncertain what, exactly, they are witnessing.",
  },
  {
    title: "Secrets & Lies",
    year: 1996,
    directedBy: "Mike Leigh",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A young Black optometrist, raised by adoptive parents, decides to find her birth mother and discovers she is a white working-class woman who has suppressed the memory of that birth entirely. Mike Leigh's Palme d'Or winner is built on the long scene where these two women sit with cups of tea in a café, trying to absorb what the other's existence means — one of cinema's great scenes of social realism, funny and agonising in equal measure.",
  },
  {
    title: "Naked",
    year: 1993,
    directedBy: "Mike Leigh",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A young man from Manchester, fleeing a possible rape charge, arrives in London and spends a night wandering the city, insulting, seducing, and philosophising at everyone he meets. Mike Leigh's most troubling film refuses to make its misanthropic protagonist either a monster or a victim — David Thewlis's Johnny is a figure of savage intelligence and savage cruelty, both simultaneously, with no resolution offered to the audience's discomfort.",
  },
  {
    title: "The Pianist",
    year: 2002,
    directedBy: "Roman Polanski",
    genre: ["Drama", "War", "Historical", "Biographical"],
    posterImageUrl: "",
    synopsis: "A celebrated Polish Jewish pianist survives the Nazi occupation and the Warsaw Ghetto through a combination of luck, the help of strangers, and the refusal of something essential in him to be extinguished. Roman Polanski's autobiographically inflected film is distinguished by its resistance to the conventions of Holocaust narrative — no redemptive arc, no explanatory framework, just the grinding contingency of survival observed with terrifying clarity.",
  },
  {
    title: "Au Revoir les Enfants",
    year: 1987,
    directedBy: "Louis Malle",
    genre: ["Drama", "War", "Historical"],
    posterImageUrl: "",
    synopsis: "At a Catholic boarding school in occupied France, a privileged boy befriends a new student who, he gradually realises, is a Jewish child hidden from the Germans. Louis Malle's most personal film — drawn from his own wartime childhood — traces the slow formation of friendship between two boys and builds to an act of betrayal so oblique and so devastating that the film's final lines remain among the most quietly shattering in cinema.",
  },
  {
    title: "The 400 Blows",
    year: 1959,
    directedBy: "François Truffaut",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A twelve-year-old Parisian boy, misunderstood at home and at school, runs away to the sea in a desperate act of assertion. François Truffaut's autobiographical debut invented the French New Wave not just stylistically but spiritually — a film of fierce tenderness toward its protagonist, refusing all easy resolutions and ending with a freeze frame on a boy's face at the water's edge that remains one of cinema's most ambiguous and enduring images.",
  },
  {
    title: "Children of Paradise",
    year: 1945,
    directedBy: "Marcel Carné",
    genre: ["Drama", "Romance", "Historical"],
    posterImageUrl: "",
    synopsis: "Made during the German occupation of France and set in the theatrical world of 1840s Paris, Marcel Carné's epic follows four men in love with a beautiful courtesan — an actor, a mime, a criminal, an aristocrat — across two long parts that constitute the Parisian theatrical world as a microcosm of life itself. A monument of French cinema, made in defiance of occupation and of the ordinary limitations of what film could contain.",
  },
  {
    title: "La Strada",
    year: 1954,
    directedBy: "Federico Fellini",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "A brutish itinerant strongman buys a simpleminded girl from her family and takes her on the road as his assistant, and she attaches to him with a devotion he is incapable of returning. Federico Fellini's most emotionally direct film is built on the tragic asymmetry between Giulietta Masina's Gelsomina — one of cinema's great performances of vulnerable innocence — and Anthony Quinn's Zampanò, whose final scene of grief for what he has destroyed is one of the most surprising acts of grace in neorealist cinema.",
  },
  {
    title: "Nights of Cabiria",
    year: 1957,
    directedBy: "Federico Fellini",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "A small Roman prostitute, robbed and nearly drowned by a lover, continues to extend her capacity for hope to each new man who offers it. Federico Fellini and Giulietta Masina's portrait of Cabiria is a sustained act of faith in the human capacity for resilience — a film that moves between comedy and heartbreak with extraordinary ease, finding in its final scene a moment of such generosity toward its character that it feels like a benediction.",
  },
  {
    title: "The Spirit of the Beehive",
    year: 1973,
    directedBy: "Víctor Erice",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "In a small Castilian village in 1940, shortly after the Civil War, a young girl sees Frankenstein at a travelling cinema and becomes obsessed with the monster's existence — asking, with the directness of childhood, why he kills and why they kill him. Víctor Erice's film is an allegory of life under Francoism rendered in the most delicate poetic terms — a film about how children process violence and injustice through imagination, shot in amber light that makes the whole world seem preserved in a dream.",
  },
  {
    title: "Raise the Red Lantern",
    year: 1991,
    directedBy: "Zhang Yimou",
    genre: ["Drama", "Historical"],
    posterImageUrl: "",
    synopsis: "In 1920s China, a young educated woman becomes the fourth concubine of a wealthy lord and must navigate the system of rituals and rivalries that governs which woman earns the privilege of lit red lanterns on any given night. Zhang Yimou's film uses the architecture of the compound and the geometry of ritual to make visible the mechanisms by which patriarchal systems destroy women — one of the most formally disciplined films of the 1990s.",
  },
  {
    title: "Farewell My Concubine",
    year: 1993,
    directedBy: "Chen Kaige",
    genre: ["Drama", "Romance", "Historical"],
    posterImageUrl: "",
    synopsis: "Two Peking Opera performers — trained together since childhood — live through fifty years of Chinese history: warlordism, Japanese occupation, the Cultural Revolution. Their bond, and the opera they have performed together, is tested by each political transformation, by the woman one of them marries, and by the love that one has always felt for the other. Chen Kaige's epic is the grandest statement of Chinese cinema about the costs exacted by history on personal life.",
  },
  {
    title: "To Live",
    year: 1994,
    directedBy: "Zhang Yimou",
    genre: ["Drama", "Historical"],
    posterImageUrl: "",
    synopsis: "A Chinese family survives the upheavals of forty years — civil war, the Great Leap Forward, the Cultural Revolution — through luck, accommodation, and the refusal to be destroyed by forces entirely beyond their control. Zhang Yimou's most formally restrained film is an act of testimony about what ordinary Chinese life cost through the middle of the twentieth century — a film of such devastating simplicity that its tragedies accumulate like blows.",
  },
  {
    title: "In the Mood for Love",
    year: 2000,
    directedBy: "Wong Kar-wai",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "Two neighbours in 1960s Hong Kong discover that their spouses are having affairs with each other, and gradually find themselves falling into the emotional space their absences create. Wong Kar-wai's most controlled film replaces conventional narrative with a system of repetition, slow motion, and Shigeru Umebayashi's score — constructing a love story told entirely in what is not said, not done, and not permitted, whose longing remains unexhausted.",
  },
  {
    title: "Happy Together",
    year: 1997,
    directedBy: "Wong Kar-wai",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "Two Hong Kong men in a volatile, destructive relationship travel to Buenos Aires and attempt, again, to start over. Wong Kar-wai's film, set on the eve of Hong Kong's handover, uses its Argentine exile and its doomed couple to ask what it means to belong anywhere — shooting in deep, bruised colours and fragmenting time in ways that mirror the couple's inability to escape the patterns of their relationship.",
  },
  {
    title: "A Brighter Summer Day",
    year: 1991,
    directedBy: "Edward Yang",
    genre: ["Drama", "Crime", "Historical"],
    posterImageUrl: "",
    synopsis: "Based on a real 1961 murder case, Edward Yang's four-hour epic follows a teenage boy in Taipei — the son of a mainland Chinese exile — navigating gang rivalries, first love, and the political ambiguity of a generation suspended between the mainland past and an uncertain Taiwanese future. Yang's most ambitious film constructs an entire social world with the patience and specificity of a great novel — the violence at its centre emerging from the accumulated weight of everything that precedes it.",
  },
  {
    title: "An Autumn Afternoon",
    year: 1962,
    directedBy: "Yasujirō Ozu",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "An aging widower, having orchestrated his daughter's marriage, must learn to live alone. Yasujirō Ozu's final film returns to the themes of Late Spring and Tokyo Story with the serenity of a man who has said what he needed to say — finding in the ordinary rituals of Japanese masculine sociality a tenderness and a sadness that accumulate with irresistible force.",
  },
  {
    title: "Maborosi",
    year: 1995,
    directedBy: "Hirokazu Kore-eda",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "A young woman, haunted by the inexplicable suicide of her first husband, remarries and moves with her son to a small fishing village on the Japan Sea coast, where beauty and grief exist in the same light. Hirokazu Kore-eda's debut feature announces a major filmmaking sensibility — still, exquisite, formally rigorous, and preoccupied with the ways in which the dead continue to live among the living.",
  },
  {
    title: "Shoplifters",
    year: 2018,
    directedBy: "Hirokazu Kore-eda",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A family of outsiders on the margins of Tokyo society — none of whom are biologically related — take in a young girl they find alone in the cold, expanding their precarious household by one more person who has nowhere else to go. Hirokazu Kore-eda's Palme d'Or winner asks what constitutes a family when all social and legal bonds are stripped away — and answers with a film of such warmth and such sadness that the question itself is transformed.",
  },
  {
    title: "Drive My Car",
    year: 2021,
    directedBy: "Ryusuke Hamaguchi",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "A celebrated theatre director, grieving his wife's death and wrestling with a secret she kept from him, travels to Hiroshima to direct Chekhov's Uncle Vanya with a multilingual cast — and is assigned a driver who will eventually become the person he can speak honestly to. Ryusuke Hamaguchi's three-hour film, drawn from Haruki Murakami's stories, uses Chekhov's text as a container for grief, jealousy, and the possibility of forgiveness.",
  },
  {
    title: "Pather Panchali",
    year: 1955,
    directedBy: "Satyajit Ray",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "The first film of the Apu Trilogy follows a poor Bengali family — the dreaming father, the practical mother, the older sister, and young Apu — in their decaying village home, as poverty narrows their options and the world opens before the children's wondering eyes. Satyajit Ray's debut, made on weekends with borrowed equipment and natural light, announced one of cinema's great artists: a film of beauty and honesty that the Cannes jury called a document of an unknown civilisation.",
  },
  {
    title: "Aparajito",
    year: 1956,
    directedBy: "Satyajit Ray",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "The second part of the Apu Trilogy follows Apu and his mother from the village to Benares, then to a town school where Apu's intelligence earns him a scholarship to Calcutta — and separates him, inevitably and irrevocably, from his mother. Satyajit Ray's continuation traces the cost of education and aspiration: the way that a bright child's future is built on the dissolution of the life behind him, and the grief that cannot be named for what is left.",
  },
  {
    title: "Apur Sansar",
    year: 1959,
    directedBy: "Satyajit Ray",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "The final part of the Apu Trilogy follows the now-grown Apu in Calcutta, his unexpected marriage, the birth of his son, and the loss that destroys him. Satyajit Ray completes his trilogy with a film that earns the emotional weight it carries — Apu's final journey to claim his son, whom he has abandoned in his grief, constitutes one of cinema's great acts of redemption.",
  },
  {
    title: "Charulata",
    year: 1964,
    directedBy: "Satyajit Ray",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "In 19th-century Bengal, a bored, intelligent, and talented wife finds herself drawn to her husband's visiting cousin, who recognises and encourages her literary gifts. Satyajit Ray's adaptation of Rabindranath Tagore's novella is his most formally refined work — a film of enormous visual delicacy that traces the awakening of feeling in a woman who has been given everything except something to do with her mind.",
  },
  {
    title: "Mahanagar",
    year: 1963,
    directedBy: "Satyajit Ray",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "In 1950s Calcutta, a middle-class housewife takes a job as a saleswoman to supplement the family income during financial hardship, discovering in the process a competence and independence she had not known she possessed — and encountering the resistance of the men around her who find this unacceptable. Satyajit Ray's most explicitly feminist film is a study in female self-discovery as radical act, made with characteristic restraint and complete moral clarity.",
  },
  {
    title: "Ankur",
    year: 1974,
    directedBy: "Shyam Benegal",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A landlord's son sent to manage agricultural land in rural India exploits a low-caste woman whose husband is absent — until his wife arrives, the exploitation becomes impossible to conceal, and the violence of the caste system asserts itself. Shyam Benegal's debut is the founding film of the Indian parallel cinema movement — a work of political seriousness and formal intelligence that refused the consolations of mainstream Hindi cinema and initiated a new tradition.",
  },
  {
    title: "Elippathayam",
    year: 1981,
    directedBy: "Adoor Gopalakrishnan",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A lazy, self-absorbed Nair landlord watches his ancestral way of life and his family estate quietly disintegrate around him, unable or unwilling to engage with the modernity that is making him irrelevant. Adoor Gopalakrishnan's film, told through extended observational sequences and deliberate formal austerity, is the most rigorous statement of Kerala cinema about the feudal order's collapse — a portrait of decline so precise it becomes almost funny.",
  },
  {
    title: "Piravi",
    year: 1988,
    directedBy: "Shaji N. Karun",
    genre: ["Drama", "Historical"],
    posterImageUrl: "",
    synopsis: "An old man in coastal Kerala waits for his son to return from the city, unaware that his son — a political activist — has disappeared into state custody during the Emergency. Shaji N. Karun's debut uses long takes and natural light to build a portrait of waiting as its own kind of suffering — a film about state violence mediated through the experience of a father who knows only that his son has not come home.",
  },
  {
    title: "Court",
    year: 2014,
    directedBy: "Chaitanya Tamhane",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "An aging folk singer and activist is arrested and tried on absurd charges for allegedly inciting a worker's suicide through a song. Chaitanya Tamhane's debut follows the case through the machinery of the Indian legal system with deliberately unheroic patience — a film of extraordinary formal discipline that uses the mundane rhythms of a slow trial to reveal a system calibrated to exhaust and demoralise the people it processes.",
  },
  {
    title: "Masaan",
    year: 2015,
    directedBy: "Neeraj Ghaywan",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "Two parallel stories unfold in Varanasi: a Dalit boy who falls in love with an upper-caste girl, and a young woman whose clandestine affair is discovered and exploited. Neeraj Ghaywan's debut moves between these stories with a formal elegance that mirrors the city itself — ancient, beautiful, shot through with death and life simultaneously — finding in the Ganges a metaphor for the way sorrow is carried and eventually, perhaps, released.",
  },
  {
    title: "Taste of Cherry",
    year: 1997,
    directedBy: "Abbas Kiarostami",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A middle-aged man drives through the hills outside Tehran, stopping to offer lifts to strangers and asking each, eventually, if they will help him commit suicide — and each encounter becomes an unexpected philosophical dialogue. Abbas Kiarostami's Palme d'Or winner is a film about the reasons to live arrived at obliquely, through conversations with people who know nothing about each other — a film that ends in a way that refuses to resolve what it has been asking.",
  },
  {
    title: "Close-Up",
    year: 1990,
    directedBy: "Abbas Kiarostami",
    genre: ["Drama", "Documentary"],
    posterImageUrl: "",
    synopsis: "A man impersonating the Iranian director Mohsen Makhmalbaf to a middle-class family who admired his films is arrested for fraud. Abbas Kiarostami reconstitutes the events using the real participants — the impostor, the family, the director himself — in a film that dissolves the line between documentary and fiction to ask what cinema is for and what it means to love it so much that you would steal someone else's identity in its name.",
  },
  {
    title: "Where Is the Friend's House?",
    year: 1987,
    directedBy: "Abbas Kiarostami",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A young boy in rural Iran accidentally takes his classmate's notebook home and, knowing the boy will be expelled if he doesn't return it, walks through the hills to the neighbouring village to find him. Abbas Kiarostami's deceptively simple film uses a child's mission of conscience to map the social and physical landscape of a rural Iranian community — a film of extraordinary gentleness and formal beauty whose moral is contained entirely in the effort it depicts.",
  },
  {
    title: "The Salesman",
    year: 2016,
    directedBy: "Asghar Farhadi",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A Tehran couple rehearsing a production of Death of a Salesman are forced to move into a new apartment after their building is damaged. An incident involving a previous tenant leads to a crisis that each of them handles differently, pulling against each other's desires for justice and for silence. Asghar Farhadi's film uses Miller's play as a structural mirror — a film about the damage done to people who cannot be honest about what has happened to them.",
  },
  {
    title: "A Special Day",
    year: 1977,
    directedBy: "Ettore Scola",
    genre: ["Drama", "Romance", "Historical"],
    posterImageUrl: "",
    synopsis: "On the day of Hitler's 1938 visit to Rome — when the city has emptied for the spectacle — a worn-out housewife and a gay anti-fascist radio announcer spend the day together in their apartment building, finding unexpected intimacy in their shared marginalisation. Ettore Scola's two-hander is a masterwork of Italian political cinema — intimate, ironic, and devastating in what it implies about the world just outside the window.",
  },
  {
    title: "Rosetta",
    year: 1999,
    directedBy: "Jean-Pierre Dardenne & Luc Dardenne",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A teenage girl in a Belgian trailer park is determined to find work and keep it — any work, any legitimate foothold in a world that seems designed to exclude her — and will do what is necessary to maintain it. The Dardenne brothers' handheld, close-quarters film follows Rosetta with the relentlessness of their camera and hers — a study in survival so morally unsparing that the audience is implicated in every choice she makes.",
  },
  {
    title: "The Son",
    year: 2002,
    directedBy: "Jean-Pierre Dardenne & Luc Dardenne",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "A carpentry instructor at a rehabilitation centre accepts a new pupil — a boy who, we learn gradually, killed his young son years earlier. The Dardenne brothers' most morally extreme film holds its secret long enough that the audience understands the teacher's behaviour as ordinary before understanding it as remarkable — a film about forgiveness so austere it refuses even the word.",
  },
  {
    title: "Ida",
    year: 2013,
    directedBy: "Paweł Pawlikowski",
    genre: ["Drama", "Historical"],
    posterImageUrl: "",
    synopsis: "A novice nun in 1960s Poland, about to take her vows, is told by the aunt she has never met that she is Jewish, her parents were killed during the war, and there is a grave to find. Paweł Pawlikowski's film, shot in cold, precise black and white in the almost-square Academy ratio, is a portrait of a Poland still haunted by what was done to its Jewish citizens — and of a young woman discovering the self she must either inhabit or refuse.",
  },
  {
    title: "Cold War",
    year: 2018,
    directedBy: "Paweł Pawlikowski",
    genre: ["Drama", "Romance", "Historical", "Musical"],
    posterImageUrl: "",
    synopsis: "A musician and a singer meet in postwar Poland and fall into a love that persists across borders, political systems, decades, and multiple separations — a love neither of them can sustain and neither can abandon. Paweł Pawlikowski's film, again shot in black and white and compressed to the Academy ratio, compresses an entire life of love into eighty-eight minutes with a kind of formal perfection that makes its sadness feel like music.",
  },
  {
    title: "The Worst Person in the World",
    year: 2021,
    directedBy: "Joachim Trier",
    genre: ["Drama", "Romance", "Comedy"],
    posterImageUrl: "",
    synopsis: "A young Oslo woman in her early thirties drifts between careers, relationships, and versions of herself — intelligent, charming, self-sabotaging — as she tries to figure out who she actually is and what she actually wants. Joachim Trier's film is the most generous portrayal of female ambivalence in recent cinema — a film that refuses to judge its protagonist for her restlessness, and that earns its emotion precisely because it has spent so long watching her honestly.",
  },
  {
    title: "Roma",
    year: 2018,
    directedBy: "Alfonso Cuarón",
    genre: ["Drama", "Historical", "Biographical"],
    posterImageUrl: "",
    synopsis: "A domestic worker for a middle-class Mexico City family navigates the year 1970 — her employer's crumbling marriage, her own pregnancy by a man who abandons her, the Corpus Christi massacre — while the children she cares for grow up around her. Alfonso Cuarón's personal film, shot in black and white with extraordinary patience and precision, is a memorial to the domestic workers whose labour sustained middle-class Mexican life and whose lives went largely unrecorded.",
  },
  {
    title: "Aftersun",
    year: 2022,
    directedBy: "Charlotte Wells",
    genre: ["Drama"],
    posterImageUrl: "",
    synopsis: "An adult woman tries to reconstruct a holiday she took with her father when she was eleven from fragments of video footage and memory — knowledge accumulated since that casts everything she remembers in a different light. Charlotte Wells' debut is a film about grief and retrospective understanding — about the gap between what a child perceives and what an adult retrospectively knows — shot with a delicacy that makes its final image, of a father dancing in a light-soaked doorway, devastating.",
  },
  {
    title: "The Zone of Interest",
    year: 2023,
    directedBy: "Jonathan Glazer",
    genre: ["Drama", "Historical", "War"],
    posterImageUrl: "",
    synopsis: "The commandant of Auschwitz lives with his family in a house adjacent to the camp walls — tending his garden, celebrating birthdays, discussing career prospects — as the sounds of the camp drift over the wall. Jonathan Glazer's film refuses to show what lies beyond those walls, finding in the domestic scenes it does show something more damning than direct representation — a portrait of moral dissociation so complete it rewrites the category of evil.",
  },
  {
    title: "Past Lives",
    year: 2023,
    directedBy: "Celine Song",
    genre: ["Drama", "Romance"],
    posterImageUrl: "",
    synopsis: "Two childhood sweethearts in Seoul, separated when one emigrated to Canada, reconnect twice — once in their twenties via the internet, once in their thirties when he visits New York — and must negotiate the distance between the people they were and the people they have become. Celine Song's debut is a film about the architecture of the unlived life — a love story in which the deepest feeling is for what cannot be, rendered with an almost unendurable tenderness and restraint.",
  },
];

// ─── Seed Logic ───────────────────────────────────────────────────────────────

async function main() {
  const readyMovies = DRAMA_MOVIES.filter((m) => m.synopsis.trim() !== "");
  const pendingMovies = DRAMA_MOVIES.filter((m) => m.synopsis.trim() === "");

  console.log(`\nTheCinePrism — Drama Seed`);
  console.log(`Total:   ${DRAMA_MOVIES.length}`);
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
        const missingGenres = movie.genre.filter((g) => !existing.genre.includes(g));
        if (missingGenres.length === 0) {
          console.log(`  ⏭  Already in DB with correct genres — skipping`);
          skipped++;
        } else {
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
    } catch (err: any) {
      console.error(`  ✗  Error: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped:  ${skipped} (already in DB)`);
  if (errors > 0) console.log(`Errors:   ${errors}`);
  console.log(`─────────────────────────────────────────\n`);

  if (pendingMovies.length > 0) {
    console.log(`Still needs synopsis (${pendingMovies.length}):`);
    pendingMovies.forEach((m, i) =>
      console.log(`  ${String(i + 1).padStart(2, " ")}. ${m.title} (${m.year})`)
    );
    console.log();
  }
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
