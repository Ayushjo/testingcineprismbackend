import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";
import * as crypto from "crypto";
import * as dns from "dns";
import axios from "axios";
import { Upload } from "@aws-sdk/lib-storage";
import { s3Client, BUCKET_NAME } from "../config/aws";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

dns.setDefaultResultOrder("ipv4first");

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

interface HorrorMovie {
  title: string;
  year: number;
  directedBy: string;
  genre: string[];
  posterImageUrl: string;
  synopsis: string;
}

const HORROR_MOVIES: HorrorMovie[] = [
  {
    title: "The Texas Chain Saw Massacre",
    year: 1974,
    directedBy: "Tobe Hooper",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "A group of young Texans driving through rural Texas encounter a family of cannibalistic killers. Tobe Hooper's film, shot in documentary rawness in the summer heat, is less a narrative than an assault — a sustained, sweat-soaked experience of pure dread that redefined what horror cinema could do to an audience. Its power lies not in explicit gore but in an atmosphere of oppressive, real-feeling wrongness that no amount of subsequent imitation has diminished.",
  },
  {
    title: "The Exorcist",
    year: 1973,
    directedBy: "William Friedkin",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "A twelve-year-old girl in Georgetown begins exhibiting signs of demonic possession — first behavioural disturbances, then physical manifestations that defy medical explanation — and her actress mother calls in a Jesuit priest. William Friedkin's film is the defining work of religious horror: a study in institutional certainty — scientific, religious, maternal — eroded by something it has no framework to accommodate. The fear it generates is inseparable from the faith crisis at its core.",
  },
  {
    title: "Psycho",
    year: 1960,
    directedBy: "Alfred Hitchcock",
    genre: ["Horror", "Thriller", "Crime"],
    posterImageUrl: "",
    synopsis: "A secretary on the run with stolen money stops at an isolated motel run by the diffident Norman Bates and his domineering mother. Alfred Hitchcock's film killed its nominal protagonist in the first third and substituted dread for plot — restructuring the horror film so completely that it had to be rebuilt around what Psycho had done. The shower scene remains the most analysed sequence in cinema history.",
  },
  {
    title: "Jaws",
    year: 1975,
    directedBy: "Steven Spielberg",
    genre: ["Horror", "Thriller", "Adventure"],
    posterImageUrl: "",
    synopsis: "A great white shark begins attacking bathers off the coast of Amity Island, and the town's police chief, a marine biologist, and a grizzled shark hunter set out to sea to kill it. Steven Spielberg's film invented the summer blockbuster while achieving something far more specific: a portrait of male inadequacy in the face of overwhelming natural force, built on performances of extraordinary mutual chemistry and a score that has become synonymous with approaching dread.",
  },
  {
    title: "Rosemary's Baby",
    year: 1968,
    directedBy: "Roman Polanski",
    genre: ["Horror", "Thriller", "Psychological"],
    posterImageUrl: "",
    synopsis: "A young woman moves into a gothic Manhattan apartment building with her ambitious actor husband, becomes pregnant, and begins to suspect that her neighbours and husband have made a pact involving her unborn child. Roman Polanski's film is horror as gaslighting — the systematic dismantling of a woman's trust in her own perceptions by the men and institutions around her, culminating in a final image whose horror is inseparable from its tenderness.",
  },
  {
    title: "Night of the Living Dead",
    year: 1968,
    directedBy: "George A. Romero",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "Strangers trapped in a rural farmhouse fight off a rising tide of reanimated dead while arguing about how to survive. George A. Romero's guerrilla horror classic invented the modern zombie while simultaneously dissecting the failure of American social cohesion — the film's true antagonists are not the undead outside the door but the fear, racism, and self-interest of the living within it. Shot in grainy black and white that makes it feel like newsreel footage of an actual catastrophe.",
  },
  {
    title: "Audition",
    year: 1999,
    directedBy: "Takashi Miike",
    genre: ["Horror", "Thriller"],
    posterImageUrl: "",
    synopsis: "A widowed television producer is persuaded by his son to hold a fake audition to find a new wife, and becomes enchanted by a quiet, melancholy woman who is hiding something. Takashi Miike's film spends its first hour as a tender romantic drama before detonating into something utterly unlike what preceded it — a descent into body horror of such sustained, methodical precision that it has disturbed every audience that has ever encountered it.",
  },
  {
    title: "Frankenstein",
    year: 1931,
    directedBy: "James Whale",
    genre: ["Horror", "Science Fiction"],
    posterImageUrl: "",
    synopsis: "A scientist obsessed with the creation of life assembles a creature from corpse parts and animates it with electricity, bringing into the world something he cannot control and will not accept. James Whale's Universal classic is less a horror film than a tragedy — the Monster's lumbering, bewildered suffering at the hands of the world that made and immediately rejected him is cinema's earliest and most enduring meditation on the cruelty of creation without care.",
  },
  {
    title: "Salò, or the 120 Days of Sodom",
    year: 1975,
    directedBy: "Pier Paolo Pasolini",
    genre: ["Horror", "Drama"],
    posterImageUrl: "",
    synopsis: "In the final days of Italian fascism, four powerful libertines abduct eighteen teenagers to a villa where they subject them to one hundred and twenty days of ritual degradation. Pier Paolo Pasolini's final film is the most extreme work in the canon of art cinema — an adaptation of de Sade transposed to Mussolini's Republic of Salò that uses sexual violence as a systematic metaphor for fascism's logic: the total reduction of persons to objects for the use of power.",
  },
  {
    title: "Carrie",
    year: 1976,
    directedBy: "Brian De Palma",
    genre: ["Horror", "Thriller"],
    posterImageUrl: "",
    synopsis: "A telekinetic teenage girl, tormented at school and suffocated at home by her fanatically religious mother, is pushed past her limits at the senior prom. Brian De Palma's adaptation of Stephen King's first novel is a horror film about puberty as humiliation and rage, deploying split screens, slow motion, and operatic excess to transform a revenge fantasy into something that mourns its protagonist even as it appalls us with what she does.",
  },
  {
    title: "Alien",
    year: 1979,
    directedBy: "Ridley Scott",
    genre: ["Horror", "Science Fiction", "Thriller"],
    posterImageUrl: "",
    synopsis: "The crew of a commercial spacecraft on a routine mission answers a distress call from a desolate moon and brings back a passenger no one asked for. Ridley Scott's film fuses the haunted-house movie with science fiction to create something that operates on primal bodily terror — the creature's reproductive mechanism, its acid blood, its design by H.R. Giger, all constitute a sustained assault on the body's integrity that has never been bettered.",
  },
  {
    title: "King Kong",
    year: 1933,
    directedBy: "Merian C. Cooper & Ernest B. Schoedsack",
    genre: ["Horror", "Adventure", "Fantasy"],
    posterImageUrl: "",
    synopsis: "A film crew sails to a mysterious island to make a movie and encounters a giant ape who is transported back to New York and put on display — until he escapes. Cooper and Schoedsack's film is the founding document of movie spectacle, a monster movie in which the monster is also the most sympathetic figure — a creature of genuine grandeur brought low by human exploitation, whose death atop the Empire State Building achieves something close to tragedy.",
  },
  {
    title: "The Silence of the Lambs",
    year: 1991,
    directedBy: "Jonathan Demme",
    genre: ["Horror", "Thriller", "Crime"],
    posterImageUrl: "",
    synopsis: "An FBI trainee hunting a serial killer who skins his victims is sent to consult with the imprisoned Dr. Hannibal Lecter — himself a brilliant cannibal and psychiatrist who agrees to help only on his own mysterious terms. Jonathan Demme's film won all five major Academy Awards by being something the genre had never produced: a horror film of total seriousness, building toward a finale of suffocating darkness from which its heroine emerges changed.",
  },
  {
    title: "Nosferatu: A Symphony of Horror",
    year: 1922,
    directedBy: "F.W. Murnau",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "An unauthorised adaptation of Bram Stoker's Dracula in which an estate agent's clerk travels to Transylvania to close a property sale with the reclusive Count Orlok, who is something ancient and terrible. F.W. Murnau's expressionist silent film invented the visual grammar of vampire cinema — Max Schreck's Count Orlok, with his rat-like features and shadow that moves independently of its body, remains the most uncanny figure in horror history.",
  },
  {
    title: "Don't Look Now",
    year: 1973,
    directedBy: "Nicolas Roeg",
    genre: ["Horror", "Thriller", "Mystery"],
    posterImageUrl: "",
    synopsis: "A grieving couple travel to Venice after the accidental drowning of their young daughter, where the husband begins seeing visions of a small red-coated figure darting through the fog-shrouded streets. Nicolas Roeg's film is horror and grief inseparable — a study in the distortions that loss produces in perception, built from fragmented editing that mirrors the mind's refusal to process trauma, culminating in an ending of stunning, cold violence.",
  },
  {
    title: "Halloween",
    year: 1978,
    directedBy: "John Carpenter",
    genre: ["Horror", "Thriller"],
    posterImageUrl: "",
    synopsis: "A psychiatric patient escapes on Halloween night and returns to the Illinois town where, fifteen years earlier, he murdered his sister, fixating on a group of teenage babysitters. John Carpenter's slasher prototype invented the grammar that a hundred imitators would dilute — the masked, motiveless, seemingly indestructible Shape given terrifying form by Dean Cundey's Panavision cinematography, a budget of $300,000, and a minimalist score that Carpenter composed himself.",
  },
  {
    title: "Diabolique",
    year: 1955,
    directedBy: "Henri-Georges Clouzot",
    genre: ["Horror", "Thriller", "Mystery"],
    posterImageUrl: "",
    synopsis: "The wife and mistress of a brutal schoolmaster conspire to drown him in a bathtub and dump the body in the school's swimming pool — only for the pool to be drained and the body to be missing. Henri-Georges Clouzot's masterwork of sustained suspense operated so effectively on its audience that the director placed signs outside cinemas begging late-comers not to reveal the ending. Its central twist remains one of cinema's most precise acts of audience manipulation.",
  },
  {
    title: "The Shining",
    year: 1980,
    directedBy: "Stanley Kubrick",
    genre: ["Horror", "Thriller", "Psychological"],
    posterImageUrl: "",
    synopsis: "A writer takes his wife and young son to an isolated Colorado hotel for the winter as its caretaker, and the hotel's history begins to work on his latent violence, his wife's isolation, and his son's psychic visions. Stanley Kubrick's adaptation of Stephen King strips the novel's supernatural explanations in favour of ambiguity — a film about domestic violence, alcoholism, and masculine failure deployed through corridors and ballrooms and a hedge maze of immaculate, terrible geometry.",
  },
  {
    title: "The Mummy",
    year: 1932,
    directedBy: "Karl Freund",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "An ancient Egyptian priest, accidentally revived when his tomb is opened by a British archaeological expedition, returns in human guise to find the reincarnation of his long-dead love. Karl Freund's Universal horror vehicle showcases Boris Karloff in perhaps his finest performance — the film's horror is less visceral than atmospheric, a work of ancient, patient obsession that creates unease from stillness and the immoveable weight of the past.",
  },
  {
    title: "Get Out",
    year: 2017,
    directedBy: "Jordan Peele",
    genre: ["Horror", "Thriller"],
    posterImageUrl: "",
    synopsis: "A Black man visiting his white girlfriend's family in the liberal suburbs becomes increasingly unnerved by the behaviour of the Black servants — until a twist reveals a system of exploitation more insidious than any he might have anticipated. Jordan Peele's debut is the most politically precise American horror film in decades — a film that uses the conventions of the genre to map the specific texture of racism in a milieu that congratulates itself on having transcended it.",
  },
  {
    title: "Black Sunday",
    year: 1960,
    directedBy: "Mario Bava",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "A witch burned and masked in 17th-century Moldavia returns two centuries later to possess her descendant and exact revenge. Mario Bava's debut feature established Italian horror as its own aesthetic universe — shot in a black-and-white of extraordinary beauty, its Gothic excess and the devastating face of Barbara Steele created a template for European horror that would define the next two decades.",
  },
  {
    title: "Carnival of Souls",
    year: 1962,
    directedBy: "Herk Harvey",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "A young woman survives a car accident in which two companions drown, drives to a new city to take a job as a church organist, and begins to be haunted by pale, silent figures who follow her everywhere. Herk Harvey's almost entirely forgotten film was shot on a budget of $30,000 and achieves, through silence and Utah locations and the bleached face of its protagonist, a dreamlike unease that no amount of money could have replicated — a film that exists on the border between the living and the dead.",
  },
  {
    title: "Dawn of the Dead",
    year: 1978,
    directedBy: "George A. Romero",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "Four survivors of the zombie apocalypse take shelter in a large shopping mall, secure it against the dead, and find themselves living in consumer luxury while the world outside falls apart. George A. Romero's sequel to Night of the Living Dead is a horror film and a satire in equal measure — the mall as a vision of American consumer society reduced to its essence, populated by dead things who still instinctively push past each other toward the stores.",
  },
  {
    title: "The Blair Witch Project",
    year: 1999,
    directedBy: "Daniel Myrick & Eduardo Sánchez",
    genre: ["Horror", "Mystery"],
    posterImageUrl: "",
    synopsis: "Three student filmmakers disappear in the Black Hills forest of Maryland while making a documentary about a local legend, and their footage is recovered a year later. The first film to weaponise the found-footage format, The Blair Witch Project derives its terror not from what is shown but from the imagination it activates in the dark of a tent, in the sound of something moving outside, in the final image that takes half a second to understand.",
  },
  {
    title: "Scream",
    year: 1996,
    directedBy: "Wes Craven",
    genre: ["Horror", "Thriller", "Mystery"],
    posterImageUrl: "",
    synopsis: "A year after her mother's murder, a teenage girl becomes the target of a masked killer whose attacks seem to follow the rules of slasher movies. Wes Craven's film is a horror movie that understands horror movies — playful, knowing, and genuinely frightening despite its self-awareness, with an opening sequence that kills its most famous cast member before the title card and establishes that in this film, the rules can and will be broken.",
  },
  {
    title: "The Innocents",
    year: 1961,
    directedBy: "Jack Clayton",
    genre: ["Horror", "Mystery"],
    posterImageUrl: "",
    synopsis: "A Victorian governess arrives at a remote country estate to care for two beautiful, eerily self-possessed children, and becomes convinced that the spirits of two dead servants are possessing them. Jack Clayton's adaptation of Henry James' The Turn of the Screw is the finest literary ghost story on film — preserving the novella's essential ambiguity about whether the haunting is real or the projection of a repressed mind, in cinematography of extraordinary monochrome beauty.",
  },
  {
    title: "Dracula",
    year: 1931,
    directedBy: "Tod Browning",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "Count Dracula travels from Transylvania to England, preying on the citizens of London until a professor of occult lore gathers a small band of believers to hunt and destroy him. Tod Browning's Universal horror landmark gave Bela Lugosi his defining role and established the theatrical visual grammar that would govern vampire films for decades — a film of staircase entrances and hypnotic gazes that operates through stage-trained performance and succeeds entirely.",
  },
  {
    title: "The Wicker Man",
    year: 1973,
    directedBy: "Robin Hardy",
    genre: ["Horror", "Mystery"],
    posterImageUrl: "",
    synopsis: "A Scottish police sergeant travels to a remote Hebridean island to investigate a missing child, and discovers a pagan community practicing rituals incompatible with his devout Christianity. Robin Hardy's folk horror masterpiece is the only film in which the detective, the victims, and the perpetrators all believe they are doing exactly the right thing — a horror film about faith in which both the detective's Christianity and the islanders' paganism are treated with equal anthropological seriousness.",
  },
  {
    title: "The Phantom of the Opera",
    year: 1925,
    directedBy: "Rupert Julian",
    genre: ["Horror", "Romance"],
    posterImageUrl: "",
    synopsis: "A disfigured musical genius haunts the Paris Opera, tutoring a young soprano he has fallen obsessively in love with and killing those who oppose his vision for her career. Rupert Julian's silent spectacular built the myth of Erik around Lon Chaney's extraordinary self-designed makeup — the unmasking scene reportedly caused fainting in early audiences — and remains the template for every version that followed.",
  },
  {
    title: "Eyes Without a Face",
    year: 1960,
    directedBy: "Georges Franju",
    genre: ["Horror", "Thriller", "Drama"],
    posterImageUrl: "",
    synopsis: "A renowned Parisian surgeon, consumed by guilt over a car accident that destroyed his daughter's face, has his devoted assistant abduct young women so that he can attempt a radical face transplant. Georges Franju's poetic horror film is unlike any other — languid, mournful, and strangely beautiful in its imagery, transforming a story of monstrous obsession into something closer to a tragic fable about the limits of love.",
  },
  {
    title: "Ringu",
    year: 1998,
    directedBy: "Hideo Nakata",
    genre: ["Horror", "Mystery", "Thriller"],
    posterImageUrl: "",
    synopsis: "A journalist investigates a cursed videotape that kills everyone who watches it within seven days — a tape she then watches herself. Hideo Nakata's film launched J-horror as a global phenomenon by locating its terror in everyday technology and domestic space, and in the figure of Sadako — a pale woman whose emergence from a television screen is so specifically wrong that it bypassed the intellect and lodged directly in the nervous system.",
  },
  {
    title: "The Night of the Hunter",
    year: 1955,
    directedBy: "Charles Laughton",
    genre: ["Horror", "Thriller", "Drama", "Film Noir"],
    posterImageUrl: "",
    synopsis: "A self-appointed preacher with LOVE and HATE tattooed on his knuckles marries a widow to get close to her children, who alone know where their executed father hid stolen money. Charles Laughton's only film as director remains one of the most visually extraordinary pictures ever made — a fever-dream of Americana that turns a fairy-tale pursuit into something mythic, deeply strange, and genuinely terrifying.",
  },
  {
    title: "Evil Dead 2: Dead by Dawn",
    year: 1987,
    directedBy: "Sam Raimi",
    genre: ["Horror", "Comedy"],
    posterImageUrl: "",
    synopsis: "A man stranded in a cabin in the woods fights off increasingly grotesque demonic possession — including, eventually, his own hand. Sam Raimi's sequel/remake is cinema's most sustained demonstration that horror and slapstick are the same genre — a film of delirious formal invention in which the camera itself seems to be having a better time than anyone in the frame, and Bruce Campbell's physical performance achieves something approaching genuine greatness.",
  },
  {
    title: "Invasion of the Body Snatchers",
    year: 1956,
    directedBy: "Don Siegel",
    genre: ["Horror", "Science Fiction", "Thriller"],
    posterImageUrl: "",
    synopsis: "A small California town doctor discovers that the townspeople are being replaced by emotionless duplicates grown from alien seed pods. Don Siegel's lean, urgent science-fiction horror can be read as anti-communist paranoia or anti-McCarthyite allegory with equal conviction — a film about the terror of conformity whose central horror is indistinguishable from its political one: you cannot tell who has been replaced.",
  },
  {
    title: "Hereditary",
    year: 2018,
    directedBy: "Ari Aster",
    genre: ["Horror", "Thriller"],
    posterImageUrl: "",
    synopsis: "A family in mourning after the death of a secretive grandmother begins to experience strange and escalating supernatural events. Ari Aster's debut is the most formally assured horror film of its decade — a grief film that mutates into something cosmically terrible, building its horror through the slow accumulation of domestic detail until a single explosive act of violence midway through permanently realigns the film's coordinates. Toni Collette's performance belongs in the category of cinema's great acts of total commitment.",
  },
  {
    title: "Deep Red",
    year: 1975,
    directedBy: "Dario Argento",
    genre: ["Horror", "Mystery", "Thriller"],
    posterImageUrl: "",
    synopsis: "A jazz musician witnesses the murder of a psychic and becomes obsessed with identifying the killer, disturbed by a detail in the crime scene he cannot consciously place. Dario Argento's giallo masterpiece is a film in which the solution to the mystery has been visible to the audience since the opening minutes — the killer hidden in the background of a reflection — making the film a study in the unreliability of perception, shot with hallucinatory visual bravura.",
  },
  {
    title: "Freaks",
    year: 1932,
    directedBy: "Tod Browning",
    genre: ["Horror", "Drama"],
    posterImageUrl: "",
    synopsis: "A beautiful trapeze artist in a travelling circus marries a little person for his fortune and, when her scheme is discovered, the circus community of performers takes revenge. Tod Browning's extraordinary film cast actual sideshow performers in a work that simultaneously exploits and defends them — a film whose horror lies entirely with its beautiful, normal, villainous characters, and whose famous final image generated a studio scandal that ended Browning's career.",
  },
  {
    title: "Kwaidan",
    year: 1964,
    directedBy: "Masaki Kobayashi",
    genre: ["Horror", "Fantasy"],
    posterImageUrl: "",
    synopsis: "Four ghost stories drawn from Japanese folklore — a samurai haunted by the snow woman, a blind biwa player who encounters the dead, a man who sees his own reflection — rendered as theatrical, visually astonishing fables. Masaki Kobayashi's anthology is the most formally beautiful horror film ever made — shot on enormous studio sets that make no pretense of realism, operating instead as pure image and atmosphere, each story a different kind of encounter with the dead.",
  },
  {
    title: "Bride of Frankenstein",
    year: 1935,
    directedBy: "James Whale",
    genre: ["Horror", "Science Fiction"],
    posterImageUrl: "",
    synopsis: "The Monster survives and demands a mate, while Dr. Frankenstein is coerced by the eccentric Dr. Pretorius into creating one. James Whale's sequel is more lavish, more bizarre, and more openly camp than its predecessor — a film that is funny, horrifying, and genuinely moving in ways the original never attempted, culminating in an ending of unexpected pathos.",
  },
  {
    title: "The Devils",
    year: 1971,
    directedBy: "Ken Russell",
    genre: ["Horror", "Drama", "Historical"],
    posterImageUrl: "",
    synopsis: "A 17th-century French priest's political autonomy in the walled city of Loudun makes him an enemy of Cardinal Richelieu, while a sexually obsessed prioress accuses him of demonic possession and orchestrates a witchcraft trial. Ken Russell's operatic, scandalous, multiply censored film is an act of sustained cinema as assault — a study in institutional sadism that remains the most extreme film ever to be given a major studio release.",
  },
  {
    title: "28 Days Later",
    year: 2002,
    directedBy: "Danny Boyle",
    genre: ["Horror", "Thriller", "Science Fiction"],
    posterImageUrl: "",
    synopsis: "A man wakes from a coma in an empty London hospital to find Britain devastated by a Rage virus that has transformed the infected into screaming, sprinting killers. Danny Boyle's film revitalised zombie cinema by making its infected something immediate and terrifyingly fast — a horror film that is also a love story and a study in what violence does to those who survive it, shot on DV in a deserted London that remains one of cinema's most arresting images.",
  },
  {
    title: "Vampyr",
    year: 1932,
    directedBy: "Carl Theodor Dreyer",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "A young traveller in a rural French village finds himself drawn into a reality in which shadows move independently of their owners and a vampire preys on the village women. Carl Theodor Dreyer's film, shot in a soft-focus haze that makes it look like a dream being imperfectly recalled, is the most formally radical horror film of the sound era — a work in which the border between the living and the dead is not a line but a fog.",
  },
  {
    title: "Manhunter",
    year: 1986,
    directedBy: "Michael Mann",
    genre: ["Horror", "Thriller", "Crime"],
    posterImageUrl: "",
    synopsis: "A retired FBI profiler with an uncanny talent for entering the minds of killers is reluctantly brought back to help catch a serial murderer known as the Tooth Fairy. Michael Mann's original adaptation of Thomas Harris predates The Silence of the Lambs by five years and remains its superior in formal terms — cold, stylised, and deeply unsettling in its portrait of empathy as a form of self-destruction.",
  },
  {
    title: "The Invisible Man",
    year: 1933,
    directedBy: "James Whale",
    genre: ["Horror", "Science Fiction"],
    posterImageUrl: "",
    synopsis: "A scientist who has discovered a formula for invisibility arrives in a small English village, his head swathed in bandages, and slowly descends into megalomania as the drug's side effects destroy his sanity. James Whale's Universal horror entry is the most technically inventive of its era — the effects of Claude Rains' absence achieved through methods that still seem like actual magic — and the most explicitly comic, with Rains' magnificent voice carrying the full weight of a performance without a face.",
  },
  {
    title: "The Thing",
    year: 1982,
    directedBy: "John Carpenter",
    genre: ["Horror", "Science Fiction", "Thriller"],
    posterImageUrl: "",
    synopsis: "An Antarctic research team encounters an alien organism capable of perfectly imitating any living creature, and the resulting paranoia makes it impossible to distinguish friend from monster. John Carpenter's remake uses Rob Bottin's grotesque practical effects to externalise a horror about identity and trust — a film whose central question (who is human?) is never definitively answered, and whose final image of two survivors watching each other in the cold is one of cinema's most perfectly calibrated acts of ambiguity.",
  },
  {
    title: "Godzilla",
    year: 1954,
    directedBy: "Ishirō Honda",
    genre: ["Horror", "Science Fiction"],
    posterImageUrl: "",
    synopsis: "A prehistoric creature awakened and mutated by hydrogen bomb testing emerges from the Pacific Ocean to destroy Tokyo. Ishirō Honda's film is not a monster movie but a film about Hiroshima — a work of national trauma displacement in which the bomb is given a body and walked through a major city, and the horror of what it does is inseparable from the very specific horror of what actually happened nine years earlier.",
  },
  {
    title: "The Birds",
    year: 1963,
    directedBy: "Alfred Hitchcock",
    genre: ["Horror", "Thriller"],
    posterImageUrl: "",
    synopsis: "Inexplicably and without provocation, the birds of Bodega Bay, California, begin attacking the human population. Alfred Hitchcock's most formally unnerving film abandons the resolution his genre work usually provided — there is no explanation, no end in sight, and the final image of the car moving through a landscape of watching, waiting birds is the most open ending of his career, a film that says: this is simply how it is now.",
  },
  {
    title: "The Witch",
    year: 2015,
    directedBy: "Robert Eggers",
    genre: ["Horror", "Historical"],
    posterImageUrl: "",
    synopsis: "A Puritan family expelled from a Massachusetts plantation in the 1630s settles alone at the edge of a dark forest, where their crops fail, their infant disappears, and their eldest daughter comes under suspicion of witchcraft. Robert Eggers' debut operates entirely within the belief system of its characters — a film in which God may be absent and the Devil may be real, shot in the flat grey light of New England winter and spoken in the period-accurate language of Puritan devotion.",
  },
  {
    title: "Onibaba",
    year: 1964,
    directedBy: "Kaneto Shindo",
    genre: ["Horror", "Drama"],
    posterImageUrl: "",
    synopsis: "During a period of civil war in 14th-century Japan, a woman and her daughter-in-law survive by killing wandering samurai and selling their armour, until a neighbour begins to seduce the younger woman and threatens their arrangement. Kaneto Shindo's film is horror rooted in social survival — the demon mask that becomes central to its plot is less a supernatural element than a natural consequence of the relationships between people left to improvise their survival in a landscape stripped of all order.",
  },
  {
    title: "Irreversible",
    year: 2002,
    directedBy: "Gaspar Noé",
    genre: ["Horror", "Thriller", "Crime"],
    posterImageUrl: "",
    synopsis: "Told in reverse chronological order, a man seeks revenge for the brutal rape and beating of his girlfriend. Gaspar Noé's film is among the most formally aggressive and morally uncompromising works in cinema — the assault sequence, nine uninterrupted minutes, deliberately exceeds narrative purpose, making the audience complicit in an act of witness they cannot undo. The reversed chronology means we mourn the love we have already seen destroyed.",
  },
  {
    title: "Blood and Black Lace",
    year: 1964,
    directedBy: "Mario Bava",
    genre: ["Horror", "Mystery", "Crime"],
    posterImageUrl: "",
    synopsis: "A masked killer murders the models of a high-fashion house in a series of elaborately staged killings to retrieve a compromising diary. Mario Bava's stylised giallo is the direct ancestor of every slasher film — the first work to place its emphasis on the elaborate staging of killings as set pieces, and to deploy colour (Bava's extraordinary use of primary light gels) as an instrument of pure sensation rather than narrative meaning.",
  },
  {
    title: "Let the Right One In",
    year: 2008,
    directedBy: "Tomas Alfredson",
    genre: ["Horror", "Romance", "Drama"],
    posterImageUrl: "",
    synopsis: "A lonely, bullied twelve-year-old boy in a Stockholm suburb befriends the girl who has just moved in next door — who turns out to be a vampire of indeterminate age. Tomas Alfredson's adaptation of John Ajvide Lindqvist's novel is the most tender horror film ever made — a love story between two outsiders in which the vampiric nature of one is the condition of the other's survival, not its obstacle. Shot in the cold, still blue light of a Swedish winter.",
  },
  {
    title: "The Cabinet of Dr. Caligari",
    year: 1920,
    directedBy: "Robert Wiene",
    genre: ["Horror", "Mystery"],
    posterImageUrl: "",
    synopsis: "A tyrannical carnival hypnotist controls a somnambulist, sending him out at night to commit murders. Robert Wiene's German Expressionist film builds its horror entirely from distorted sets — slanting walls, zigzag pathways, painted shadows — creating a visual world that is itself a projection of disturbed psychology. The film invented the twist ending and established cinema as capable of externalising internal states in ways that realism could never achieve.",
  },
  {
    title: "The Fly",
    year: 1986,
    directedBy: "David Cronenberg",
    genre: ["Horror", "Science Fiction", "Romance"],
    posterImageUrl: "",
    synopsis: "A scientist's teleportation experiment goes wrong when a housefly enters the machine with him, and he begins, cell by cell, to transform into something that is no longer human. David Cronenberg's remake is body horror as love story — the most moving and most disgusting film he ever made, in which Jeff Goldblum's gradual transformation is inseparable from the experience of watching someone you love become unrecognisable. The metaphorical resonance with AIDS, in 1986, was unavoidable and deliberate.",
  },
  {
    title: "Peeping Tom",
    year: 1960,
    directedBy: "Michael Powell",
    genre: ["Horror", "Thriller", "Drama"],
    posterImageUrl: "",
    synopsis: "A young film technician compulsively films women as he murders them, capturing their terror with a spike concealed in his camera tripod. Michael Powell's scandalous film anticipated the slasher genre by two decades while simultaneously deconstructing the act of watching cinema itself — a haunting, uncomfortable masterwork about the violence latent in the male gaze and the camera that enables it.",
  },
  {
    title: "Raw",
    year: 2016,
    directedBy: "Julia Ducournau",
    genre: ["Horror", "Drama"],
    posterImageUrl: "",
    synopsis: "A committed vegetarian enrolled in a French veterinary school undergoes an initiation ritual that requires her to eat raw meat for the first time, awakening in her an appetite she cannot control. Julia Ducournau's debut is body horror as bildungsroman — a film about female desire and appetite in a world that demands their suppression, using cannibalism as the most honest metaphor available for what society does to women who want too much.",
  },
  {
    title: "What Ever Happened to Baby Jane?",
    year: 1962,
    directedBy: "Robert Aldrich",
    genre: ["Horror", "Thriller", "Drama"],
    posterImageUrl: "",
    synopsis: "A former child star holds her wheelchair-bound sister — a former movie actress — captive in their decaying Hollywood mansion, tormenting her in escalating acts of cruelty as her grip on reality slips. Robert Aldrich's Grand Guignol horror is built entirely on the collision between Bette Davis and Joan Crawford, two old enemies playing two old enemies in a film that transforms Hollywood's mythology of female stardom into something gothic and terrible.",
  },
  {
    title: "Funny Games",
    year: 1997,
    directedBy: "Michael Haneke",
    genre: ["Horror", "Thriller"],
    posterImageUrl: "",
    synopsis: "Two polite young men hold an Austrian family hostage at their lakeside vacation home, tormenting them in increasingly violent games while addressing the audience directly. Michael Haneke's film is a sustained act of aggression toward the viewer — a work about the consumption of violence for entertainment that implicates the audience in what it is watching and refuses the catharsis it has conditioned them to expect.",
  },
  {
    title: "Candyman",
    year: 1992,
    directedBy: "Bernard Rose",
    genre: ["Horror", "Thriller"],
    posterImageUrl: "",
    synopsis: "A graduate student researching urban legends about the hook-handed Candyman — said to appear if you say his name five times in a mirror — finds the legend bleeding into her real life in the housing projects of Chicago. Bernard Rose's adaptation of Clive Barker transforms the slasher myth into an elegy for lives sacrificed to structural neglect, with Tony Todd's Candyman a figure of unexpected tragic grandeur.",
  },
  {
    title: "Gremlins",
    year: 1984,
    directedBy: "Joe Dante",
    genre: ["Horror", "Comedy", "Fantasy"],
    posterImageUrl: "",
    synopsis: "A young man receives an exotic pet as a Christmas gift with strict rules that his family promptly violates, unleashing a horde of small, malevolent creatures on his small American town. Joe Dante's film is horror as subversion of the Christmas family movie — a satirical attack on consumerism and Americana that uses cartoon violence and genuine wit to produce something that entertains and disturbs in equal and inseparable measure.",
  },
  {
    title: "Dr. Jekyll and Mr. Hyde",
    year: 1931,
    directedBy: "Rouben Mamoulian",
    genre: ["Horror", "Science Fiction"],
    posterImageUrl: "",
    synopsis: "A respected London physician experiments with a formula that separates the base elements of his personality from the good, creating the brutish, predatory Hyde who pursues the pleasures his respectable life denies him. Rouben Mamoulian's Pre-Code adaptation is the most sexually explicit of the Stevenson adaptations — Fredric March's transformation scenes, achieved through camera tricks and lighting, remain among cinema's greatest practical effects.",
  },
  {
    title: "Planet Terror",
    year: 2007,
    directedBy: "Robert Rodriguez",
    genre: ["Horror", "Action", "Comedy"],
    posterImageUrl: "",
    synopsis: "A go-go dancer with a machine gun leg and a doctor with a secret lead a ragtag group of survivors against a horde of infected mutants in Texas. Robert Rodriguez's contribution to the Grindhouse double feature is a loving, excessive tribute to exploitation cinema of the 1970s — a film that wears its disreputability as a badge of honour and delivers exactly what it promises with tremendous panache.",
  },
  {
    title: "The Incredible Shrinking Man",
    year: 1957,
    directedBy: "Jack Arnold",
    genre: ["Horror", "Science Fiction"],
    posterImageUrl: "",
    synopsis: "After passing through a radioactive cloud, a man begins to shrink — gradually losing his place in his marriage, his home, and eventually in the physical world itself, until he must battle a spider to survive in his own basement. Jack Arnold's film uses its genre premise to conduct a quietly devastating meditation on masculine identity and existential scale, culminating in a final monologue of such unexpected philosophical ambition that it has never been matched in its genre.",
  },
  {
    title: "The Babadook",
    year: 2014,
    directedBy: "Jennifer Kent",
    genre: ["Horror", "Drama"],
    posterImageUrl: "",
    synopsis: "A depressed, exhausted widowed mother struggling with a disturbed young son discovers a mysterious pop-up book in the house — and the creature in the book begins to appear. Jennifer Kent's debut is grief rendered as horror — the Babadook as the physical form taken by a mother's unresolved mourning, her resentment of her child, and the depression she has refused to name. A film that understands horror's capacity to say what realism cannot.",
  },
  {
    title: "Possession",
    year: 1981,
    directedBy: "Andrzej Żuławski",
    genre: ["Horror", "Drama"],
    posterImageUrl: "",
    synopsis: "A Berlin couple's marriage disintegrates with catastrophic emotional and eventually physical violence, as the wife retreats into a secret life with a lover who is becoming something monstrous. Andrzej Żuławski's film is the most intense experience in European art cinema — a work in which emotional breakdown and supernatural horror become indistinguishable, driven by Isabelle Adjani's performance, for which she won the Cannes Best Actress award and which no one who has seen it ever forgets.",
  },
  {
    title: "The Sixth Sense",
    year: 1999,
    directedBy: "M. Night Shyamalan",
    genre: ["Horror", "Mystery", "Drama"],
    posterImageUrl: "",
    synopsis: "A child psychologist works with a troubled boy who claims to see the dead walking among the living. M. Night Shyamalan's film operates as a ghost story, a psychological drama, and a grief narrative simultaneously — its famous twist, when it arrives, retroactively reorganises everything the audience has witnessed and earns its emotional devastation precisely because it has been building toward it from the first scene.",
  },
  {
    title: "Near Dark",
    year: 1987,
    directedBy: "Kathryn Bigelow",
    genre: ["Horror", "Romance", "Western"],
    posterImageUrl: "",
    synopsis: "A young Oklahoma man is bitten by a drifter and inducted into a nomadic family of vampires travelling the American Southwest, falling in love with the girl who turned him. Kathryn Bigelow's film is a vampire movie that refuses the genre's European elegance in favour of redneck American violence — a film about found families and the compulsion to belong, shot against the vast flat landscapes of the heartland.",
  },
  {
    title: "The Wailing",
    year: 2016,
    directedBy: "Na Hong-jin",
    genre: ["Horror", "Mystery", "Thriller"],
    posterImageUrl: "",
    synopsis: "A bumbling village detective investigates a series of mysterious deaths in a rural Korean town following the arrival of a Japanese stranger, as his own daughter becomes afflicted. Na Hong-jin's film is the most spiritually overwhelming horror film of its decade — a work of immense ambition that draws on Shinto belief, Christian theology, and Korean shamanism in a narrative of escalating dread and moral disorientation, asking whether genuine evil can ever be reliably identified.",
  },
  {
    title: "Hostel: Part II",
    year: 2007,
    directedBy: "Eli Roth",
    genre: ["Horror", "Thriller"],
    posterImageUrl: "",
    synopsis: "Three American women studying abroad are lured to a Slovak hostel where they become prey for a client list of wealthy businessmen who pay to torture and kill tourists. Eli Roth's sequel improves on its predecessor by giving equal weight to the perspective of the buyers — following one man from excitement through hesitation to his own humiliation — transforming the torture horror formula into something with genuine satirical intent.",
  },
  {
    title: "Creature from the Black Lagoon",
    year: 1954,
    directedBy: "Jack Arnold",
    genre: ["Horror", "Science Fiction", "Adventure"],
    posterImageUrl: "",
    synopsis: "A scientific expedition to the Amazon discovers a living fossil — a gill-man who has survived unchanged for millions of years — and brings violence into his habitat. Jack Arnold's 3-D creature feature is Universal's last great monster, and the most poignant — the Gill-Man's pursuit of the female scientist is horror configured as unrequited desire, a creature of ancient beauty destroyed by the world that stumbles into his lagoon.",
  },
  {
    title: "Blood for Dracula",
    year: 1974,
    directedBy: "Paul Morrissey",
    genre: ["Horror", "Comedy"],
    posterImageUrl: "",
    synopsis: "Count Dracula travels from Romania to Italy in search of the virgin blood he requires to survive, only to discover that Italian aristocratic virgins are not what they advertised. Paul Morrissey's Warhol-produced film is horror as class satire — deliberately cheap, deliberately transgressive, and funnier than anything else in the vampire canon, with Udo Kier's dying Dracula as an image of aristocratic parasitism that has never been bettered.",
  },
  {
    title: "A Nightmare on Elm Street",
    year: 1984,
    directedBy: "Wes Craven",
    genre: ["Horror", "Thriller"],
    posterImageUrl: "",
    synopsis: "A burned, razor-fingered killer who was murdered by the parents of Elm Street stalks and kills their teenage children in their dreams. Wes Craven's most inventive film attacked the one place that the slasher genre had left safe — sleep — and in doing so found a new grammar for horror based on the inescapability of the unconscious. Freddy Krueger is the genre's most durable monster because he lives where logic cannot reach him.",
  },
  {
    title: "The Descent",
    year: 2005,
    directedBy: "Neil Marshall",
    genre: ["Horror", "Thriller", "Adventure"],
    posterImageUrl: "",
    synopsis: "Six women on an annual caving expedition in the North Carolina Appalachians find themselves trapped underground with creatures that have never encountered human beings before. Neil Marshall's film does the difficult thing first — establishing genuine claustrophobic dread in the cave system before the monsters arrive — and then does it again with the creatures, using darkness as a narrative tool as precisely as any director since Kubrick.",
  },
  {
    title: "I Walked with a Zombie",
    year: 1943,
    directedBy: "Jacques Tourneur",
    genre: ["Horror", "Mystery"],
    posterImageUrl: "",
    synopsis: "A Canadian nurse travels to the Caribbean island of Saint Sebastian to care for the wife of a sugar planter, and becomes entangled in a Haitian voodoo mystery that may explain the woman's strange, cataleptic condition. Jacques Tourneur's Val Lewton production is horror as poetry — a film that withholds explanation, suggesting rather than showing, suffusing its images of colonial suffering and supernatural belief with an atmosphere of irreducible strangeness.",
  },
  {
    title: "The Blob",
    year: 1958,
    directedBy: "Irvin S. Yeaworth Jr.",
    genre: ["Horror", "Science Fiction"],
    posterImageUrl: "",
    synopsis: "A gelatinous alien organism crashes to earth and begins absorbing the residents of a small Pennsylvania town, growing larger with each victim. Yeaworth's low-budget science fiction horror is less interesting as a film than as a cultural document — the teenagers who know something is wrong and cannot make the adults believe them constitutes the founding myth of American youth horror, with Steve McQueen's feature debut establishing his cool authority in the most unpromising possible context.",
  },
  {
    title: "Angst",
    year: 1983,
    directedBy: "Gerald Kargl",
    genre: ["Horror", "Crime"],
    posterImageUrl: "",
    synopsis: "Immediately after his release from prison, a convicted killer breaks into a remote Austrian farmhouse and terrorises its inhabitants. Gerald Kargl's film, based on a real case, is the most purely unpleasant viewing experience in European horror — shot in extreme close-up and handheld with a roving, claustrophobic camera that refuses to provide the distance that would make what it shows manageable, the interior narration of its killer the most disturbing use of voiceover in cinema.",
  },
  {
    title: "The Omen",
    year: 1976,
    directedBy: "Richard Donner",
    genre: ["Horror", "Thriller"],
    posterImageUrl: "",
    synopsis: "An American diplomat discovers evidence that his adopted son may be the Antichrist. Richard Donner's film is slick, expensive apocalyptic horror that works better than it deserves to — Gregory Peck's authority sells material that lesser actors would make absurd, and Jerry Goldsmith's Oscar-winning choral score gives the film a religious grandeur that transforms a conspiracy thriller about a satanic child into something approaching genuine dread.",
  },
  {
    title: "House of Wax",
    year: 1953,
    directedBy: "André De Toth",
    genre: ["Horror", "Mystery", "Crime"],
    posterImageUrl: "",
    synopsis: "A sculptor disfigured in an arson attack on his wax museum reopens with a new collection of eerily realistic figures — and the city's recent murder victims keep disappearing. André De Toth's 3-D showcase is less interesting for its medium than for Vincent Price, who turns the figure of the disfigured artist into something both sinister and sympathetic — the first of his great horror performances and the template for everything that followed.",
  },
  {
    title: "The Wolf Man",
    year: 1941,
    directedBy: "George Waggner",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "A man returning to his Welsh family estate is bitten by a wolf during a gypsy fair and begins to transform on nights of the full moon. George Waggner's Universal horror is the most genuinely tragic of the monster movies — Lawrence Talbot's lycanthropy as a condition he did not seek and cannot control, his curse as a metaphor for the darkness that passes through families and cannot be outrun. Lon Chaney Jr.'s performance is the most sympathetic in the genre.",
  },
  {
    title: "What Lies Beneath",
    year: 2000,
    directedBy: "Robert Zemeckis",
    genre: ["Horror", "Thriller", "Mystery"],
    posterImageUrl: "",
    synopsis: "A professor's wife, alone in their Vermont lakeside house while her husband works late, begins to be haunted by what appears to be the ghost of a young woman. Robert Zemeckis's film is an unabashed classical thriller in the Hitchcock mould — more knowing than original, but executed with real craft and anchored by Michelle Pfeiffer in a performance that does everything the genre asks and then some.",
  },
  {
    title: "The Little Shop of Horrors",
    year: 1960,
    directedBy: "Roger Corman",
    genre: ["Horror", "Comedy"],
    posterImageUrl: "",
    synopsis: "A florist's assistant nurtures a carnivorous plant that demands increasingly large quantities of human blood. Roger Corman shot this film in two days on standing sets using leftover stock, and inadvertently produced one of the most delightful absurdist comedies of its era — a film that Jack Nicholson appears in for a single scene as a dental patient who enjoys his appointment, which spawned a long-running musical that carries its name.",
  },
  {
    title: "Re-Animator",
    year: 1985,
    directedBy: "Stuart Gordon",
    genre: ["Horror", "Comedy", "Science Fiction"],
    posterImageUrl: "",
    synopsis: "A medical student develops a serum that reanimates the dead, with grotesquely violent results, in an adaptation of H.P. Lovecraft's Herbert West series. Stuart Gordon's film is grand guignol horror comedy pitched at exactly the right register of excess — earnest enough to generate genuine shock and irreverent enough to prevent it from becoming merely unpleasant, with Jeffrey Combs' Herbert West as one of the great comic-horror performances.",
  },
  {
    title: "Village of the Damned",
    year: 1960,
    directedBy: "Wolf Rilla",
    genre: ["Horror", "Science Fiction"],
    posterImageUrl: "",
    synopsis: "All the women of an English village simultaneously fall pregnant and give birth to identical, silver-haired children with shared minds and the power to control adults. Wolf Rilla's adaptation of John Wyndham's The Midwich Cuckoos is Cold War paranoia made flesh — the children as an alien collectivist consciousness infiltrating the English village, their blond uniformity and cold intelligence a challenge to everything the genre's traditional monster represented.",
  },
  {
    title: "The Vanishing (Spoorloos)",
    year: 1988,
    directedBy: "George Sluizer",
    genre: ["Horror", "Thriller", "Mystery"],
    posterImageUrl: "",
    synopsis: "On a road trip through France, a woman disappears at a highway rest stop. Her boyfriend spends three years searching for her, haunted not by grief but by the unbearable need to know. George Sluizer's Dutch film builds to one of cinema's most quietly devastating revelations — an ending that redefines everything before it, and that has never been equalled for sheer, cold horror. The director later remade it in Hollywood, draining it of everything that made it unbearable.",
  },
  {
    title: "Blood Feast",
    year: 1963,
    directedBy: "Herschell Gordon Lewis",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "An Egyptian caterer murders young women in Miami to collect body parts for an ancient ritual to resurrect the goddess Ishtar. Herschell Gordon Lewis' Blood Feast is the first splatter film — a work of virtually no formal ambition that nevertheless invented a genre by showing, graphically and without apology, the mutilation of human bodies on screen. Its historical importance is inverse to its artistic merit, but cinema's relationship with explicit gore begins here.",
  },
  {
    title: "Horror of Dracula",
    year: 1958,
    directedBy: "Terence Fisher",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "Count Dracula preys on the family of a young Englishman who comes to his castle, and the vampire hunter Van Helsing pursues him. Terence Fisher's Hammer Horror entry gave the Dracula myth colour, blood, and a ferocious sexuality it had previously lacked — Peter Cushing's Van Helsing and Christopher Lee's Dracula establishing an opposition that defined British horror for two decades, and Lee's physical performance giving the Count an animal magnetism Lugosi's theatrical version never possessed.",
  },
  {
    title: "A Page of Madness",
    year: 1926,
    directedBy: "Teinosuke Kinugasa",
    genre: ["Horror", "Drama"],
    posterImageUrl: "",
    synopsis: "A man takes a job as a janitor in a psychiatric institution to be near his wife, who has been committed there. Teinosuke Kinugasa's lost-and-recovered masterpiece is the most formally radical Japanese silent film — an expressionist torrent of superimpositions, abstract imagery, and rapid cutting that renders madness not as observed condition but as experienced reality, anticipating techniques that European cinema would not reach for another decade.",
  },
  {
    title: "Dead of Night",
    year: 1945,
    directedBy: "Alberto Cavalcanti & Charles Crichton & Basil Dearden & Robert Hamer",
    genre: ["Horror", "Mystery"],
    posterImageUrl: "",
    synopsis: "An architect arrives at a country house and recognises everyone from a recurring dream — which he then begins to live out through five ghost stories told by the guests, culminating in a ventriloquist's dummy that may have an independent life. The Ealing Studios anthology film is the template for the horror omnibus format — finding its most disturbing sequence in Michael Redgrave's ventriloquist, whose relationship with his dummy has no clean boundary between artist and object, sanity and possession.",
  },
  {
    title: "The Human Centipede 2 (Full Sequence)",
    year: 2011,
    directedBy: "Tom Six",
    genre: ["Horror"],
    posterImageUrl: "",
    synopsis: "A disturbed parking lot attendant, obsessed with the first Human Centipede film, attempts to create his own twelve-person version. Tom Six's sequel is remarkable less as a horror film than as a formal provocation — shot in black and white, deeply self-referential, and designed to function as a critique of the viewers who demanded escalation from the first film, turning their appetite back on them in a work of studied, cheerless brutality.",
  },
  {
    title: "Cat People",
    year: 1942,
    directedBy: "Jacques Tourneur",
    genre: ["Horror", "Mystery", "Thriller"],
    posterImageUrl: "",
    synopsis: "A Serbian-born woman believes she is descended from a race that transforms into cat people when aroused or angry, and her new American husband's attempts to consummate their marriage trigger a crisis. Jacques Tourneur's Val Lewton production invented the horror of suggestion — the famous bus sequence, in which terror is generated by something the audience never sees, remains the purest demonstration of how implication exceeds explicit revelation. A film more interested in its protagonist's psychology than her supernatural condition.",
  },
  {
    title: "Event Horizon",
    year: 1997,
    directedBy: "Paul W.S. Anderson",
    genre: ["Horror", "Science Fiction", "Thriller"],
    posterImageUrl: "",
    synopsis: "A rescue crew investigates a spaceship that disappeared into a black hole for seven years and has now returned — carrying whatever it encountered on the other side. Paul W.S. Anderson's film is undisciplined but achieves genuine unease from its central premise — the idea that the other side of a black hole might be a place of absolute evil — and Sam Neill's performance in the final act commits fully to its apocalyptic implications.",
  },
  {
    title: "Repulsion",
    year: 1965,
    directedBy: "Roman Polanski",
    genre: ["Horror", "Thriller", "Psychological"],
    posterImageUrl: "",
    synopsis: "A young Belgian woman left alone in a London flat for a week begins to hear sounds in the walls, see cracks spreading through the plaster, and experience visions of violent assault. Roman Polanski's first English-language film is a masterclass in subjective horror — a film that traps the audience inside a disintegrating mind and refuses to offer the safety of an external perspective.",
  },
  {
    title: "Suspiria",
    year: 1977,
    directedBy: "Dario Argento",
    genre: ["Horror", "Mystery"],
    posterImageUrl: "",
    synopsis: "An American ballet student arrives at a prestigious German dance academy and discovers that the school is run by a coven of witches. Dario Argento's most beloved film abandons narrative logic entirely in favour of pure sensation — primary colours of impossible intensity, a prog-rock score by Goblin that plays like a physical pressure, and a series of murders staged as baroque performance art. The most overwhelming experience in Italian horror.",
  },
  {
    title: "The Devil's Backbone",
    year: 2001,
    directedBy: "Guillermo del Toro",
    genre: ["Horror", "Drama", "Historical"],
    posterImageUrl: "",
    synopsis: "A twelve-year-old boy is left at a Republican orphanage in Franco-era Spain during the Civil War and encounters the ghost of a child who died there. Guillermo del Toro's film is the most humane ghost story in cinema — the ghost as a victim of the same historical violence that threatens every child in the building, the horror inseparable from the political reality of what war does to the young.",
  },
  {
    title: "The Haunting",
    year: 1963,
    directedBy: "Robert Wise",
    genre: ["Horror", "Mystery"],
    posterImageUrl: "",
    synopsis: "A paranormal investigator assembles a small group to spend time in Hill House — a notoriously evil mansion — including a psychic and a woman with a history of poltergeist activity who is inexplicably drawn to the building. Robert Wise's film is the definitive haunted house movie — a work that never shows a ghost and never needs to, generating its terror from architecture, sound design, and Julie Harris's performance as a woman being slowly consumed by a building that wants her to stay.",
  },
  {
    title: "Invasion of the Body Snatchers",
    year: 1978,
    directedBy: "Philip Kaufman",
    genre: ["Horror", "Science Fiction", "Thriller"],
    posterImageUrl: "",
    synopsis: "San Francisco's Health Department officials discover that alien pods are replacing the city's population with emotionless duplicates. Philip Kaufman's remake updates Don Siegel's original to the age of therapy culture and urban alienation — in a city full of people paying professionals to tell them who they are, the replacement of persons by duplicates requires hardly any behavioural change at all. Donald Sutherland's final image is the most memorable of the decade.",
  },
  {
    title: "Dead Alive",
    year: 1992,
    directedBy: "Peter Jackson",
    genre: ["Horror", "Comedy"],
    posterImageUrl: "",
    synopsis: "A mild-mannered New Zealander's domineering mother is bitten by a Sumatran Rat Monkey and begins the zombie apocalypse in his suburban Wellington home. Peter Jackson's film holds the record for the most fake blood used in any production — and is the most purely exuberant film in the zombie genre, a splatstick masterpiece in which the lawnmower sequence is simultaneously the most disgusting and the funniest thing in horror cinema.",
  },
];

async function main() {
  const readyMovies = HORROR_MOVIES.filter((m) => m.synopsis.trim() !== "");
  const pendingMovies = HORROR_MOVIES.filter((m) => m.synopsis.trim() === "");

  console.log(`\nTheCinePrism — Horror Seed`);
  console.log(`Total:   ${HORROR_MOVIES.length}`);
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
