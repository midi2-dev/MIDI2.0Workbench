
const manufacturer={
    0x01:'Sequential Circuits'
    ,0x02:'Big Briar : IDP'
    ,0x03:'Octave / Plateau : Voyetra Turtle Beach, Inc'
    ,0x04:'Moog'
    ,0x05:'Passport Designs'
    ,0x06:'Lexicon'
    ,0x07:'Kurzweil'
    ,0x08:'Fender'
    ,0x09:'Gulbransen : MIDI9'
    ,0x0A:'Delta Labs : AKG Acoustics'
    ,0x0B:'Sound Comp. : Voyce Music'
    ,0x0C:'General Electro : WaveFrame (Timeline)'
    ,0x0D:'Techmar : ADA Signal Processors, Inc'
    ,0x0E:'Matthews Research : Garfield Electronics'
    ,0x0F:'Ensoniq'
    ,0x10:'Oberheim'
    ,0x11:'PAIA : Apple, Inc.'
    ,0x12:'Simmons : Grey Matter Response'
    ,0x13:'Gentle Electric : Digidesign Inc.'
    ,0x14:'Fairlight : Palmtree Instruments'
    ,0x15:'JL Cooper'
    ,0x16:'Lowery'
    ,0x17:'Lin : Adams-Smith'
    ,0x18:'Emu / Ensoniq'
    ,0x19:'Harmony Systems'
    ,0x1A:'ART'
    ,0x1B:'Peavey : Baldwin'
    ,0x1C:'Eventide'
    ,0x1D:'Inventronics'
    ,0x1E:'Key Concepts'
    ,0x1F:'Clarity'
    ,0x20:'Bon Tempi : Passac'
    ,0x21:'S.I.E.L.'
    ,0x22:'SyntheAxe'
    ,0x23:'Stepp'
    ,0x24:'Hohner'
    ,0x25:'Crumar : Twister'
    ,0x26:'Solton : Ketron s.r.l.'
    ,0x27:'Jellinghous Ms'
    ,0x28:'CTS : Southworth Music Systems'
    ,0x29:'PPG'
    ,0x2A:'JEN'
    ,0x2B:'Solid State Logic Organ Systems'
    ,0x2C:'Audio Veritrieb-P. Struven'
    ,0x2D:'Neve'
    ,0x2E:'Soundtracs Ltd.'
    ,0x2F:'Elka'
    ,0x30: 'Dynacord'
    ,0x31: 'Viscount International Spa (Intercontinental Electronics)'
    ,0x32:'Drawmer'
    ,0x33:'Clavia Digital Instruments'
    ,0x34:'Audio Architecture'
    ,0x35:'Generalmusic Corp SpA'
    ,0x36:'Cheetah Marketing'
    ,0x37:'C.T.M.'
    ,0x38:'Simmons UK'
    ,0x39:'Soundcraft Electronics'
    ,0x3A:'Steinberg Media Technologies AG'
    ,0x3B:'Wersi Gmbh'
    ,0x3C:'AVAB Niethammer AB'
    ,0x3D:'Digigram'
    ,0x3E:'Waldorf Electronics GmbH'
    ,0x3F:'Quasimidi'
    ,0x40:'Kawai Musical Instruments MFG. CO. Ltd'
    ,0x41:'Roland Corporation'
    ,0x42:'Korg Inc.'
    ,0x43:'Yamaha Corporation'
    ,0x44:'Casio Computer Co. Ltd'
    ,0x46:'Kamiya Studio Co. Ltd'
    ,0x47:'Akai Electric Co. Ltd.'
    ,0x48:'Victor Company of Japan, Ltd.'
    ,0x4B:'Fujitsu Limited'
    ,0x4C:'Sony Corporation'
    ,0x4E:'Teac Corporation'
    ,0x50:'Matsushita Electric Industrial Co. , Ltd'
    ,0x51:'Fostex Corporation'
    ,0x52:'Zoom Corporation'
    ,0x54:'Matsushita Communication Industrial Co., Ltd.'
    ,0x55:'Suzuki Musical Instruments MFG. Co., Ltd.'
    ,0x56:'Fuji Sound Corporation Ltd.'
    ,0x57:'Acoustic Technical Laboratory, Inc.'
    ,0x59:'Faith, Inc.'
    ,0x5A:'Internet Corporation'
    ,0x5C:'Seekers Co. Ltd.'
    ,0x5F:'SD Card Association'

    ,0x7D:'Educational Use'

    ,0x7E:'Research and Development'
};

const manufacturesExtended={0x00:{},0x01:{},0x02:{},0x20:{},0x21:{},0x40:{}};
manufacturesExtended[0x00][0x01]='Time/Warner Interactive';
manufacturesExtended[0x00][0x02]='Advanced Gravis Comp. Tech Ltd.';
manufacturesExtended[0x00][0x03]='Media Vision';
manufacturesExtended[0x00][0x04]='Dornes Research Group';
manufacturesExtended[0x00][0x05]='K-Muse';
manufacturesExtended[0x00][0x06]='Stypher';
manufacturesExtended[0x00][0x07]='Digital Music Corp.';
manufacturesExtended[0x00][0x08]='IOTA Systems';
manufacturesExtended[0x00][0x09]='New England Digital';
manufacturesExtended[0x00][0x0A]='Artisyn';
manufacturesExtended[0x00][0x0B]='IVL Technologies Ltd.';
manufacturesExtended[0x00][0x0C]='Southern Music Systems';
manufacturesExtended[0x00][0x0D]='Lake Butler Sound Company';
manufacturesExtended[0x00][0x0E]='Alesis Studio Electronics';
manufacturesExtended[0x00][0x0F]='Sound Creation';
manufacturesExtended[0x00][0x10]='DOD Electronics Corp.';
manufacturesExtended[0x00][0x11]='Studer-Editech';
manufacturesExtended[0x00][0x12]='Sonus';
manufacturesExtended[0x00][0x13]='Temporal Acuity Products';
manufacturesExtended[0x00][0x14]='Perfect Fretworks';
manufacturesExtended[0x00][0x15]='KAT Inc.';
manufacturesExtended[0x00][0x16]='Opcode Systems';
manufacturesExtended[0x00][0x17]='Rane Corporation';
manufacturesExtended[0x00][0x18]='Anadi Electronique';
manufacturesExtended[0x00][0x19]='KMX';
manufacturesExtended[0x00][0x1A]='Allen & Heath Brenell';
manufacturesExtended[0x00][0x1B]='Peavey Electronics';
manufacturesExtended[0x00][0x1C]='360 Systems';
manufacturesExtended[0x00][0x1D]='Spectrum Design and Development';
manufacturesExtended[0x00][0x1E]='Marquis Music';
manufacturesExtended[0x00][0x1F]='Zeta Systems';
manufacturesExtended[0x00][0x20]='Axxes (Brian Parsonett)';
manufacturesExtended[0x00][0x21]='Orban';
manufacturesExtended[0x00][0x22]='Indian Valley Mfg.';
manufacturesExtended[0x00][0x23]='Triton';
manufacturesExtended[0x00][0x24]='KTI';
manufacturesExtended[0x00][0x25]='Breakaway Technologies';
manufacturesExtended[0x00][0x26]='Leprecon / CAE Inc.';
manufacturesExtended[0x00][0x27]='Harrison Systems Inc.';
manufacturesExtended[0x00][0x28]='Future Lab/Mark Kuo';
manufacturesExtended[0x00][0x29]='Rocktron Corporation';
manufacturesExtended[0x00][0x2A]='PianoDisc';
manufacturesExtended[0x00][0x2B]='Cannon Research Group';
manufacturesExtended[0x00][0x2C]='Reserved';
manufacturesExtended[0x00][0x2D]='Rodgers Instrument LLC';
manufacturesExtended[0x00][0x2E]='Blue Sky Logic';
manufacturesExtended[0x00][0x2F]='Encore Electronics';
manufacturesExtended[0x00][0x30]='Uptown';
manufacturesExtended[0x00][0x31]='Voce';
manufacturesExtended[0x00][0x32]='CTI Audio, Inc. (Musically Intel. Devs.)';
manufacturesExtended[0x00][0x33]='S3 Incorporated';
manufacturesExtended[0x00][0x34]='Broderbund / Red Orb';
manufacturesExtended[0x00][0x35]='Allen Organ Co.';
manufacturesExtended[0x00][0x36]='Reserved';
manufacturesExtended[0x00][0x37]='Music Quest';
manufacturesExtended[0x00][0x38]='Aphex';
manufacturesExtended[0x00][0x39]='Gallien Krueger';
manufacturesExtended[0x00][0x3A]='IBM';
manufacturesExtended[0x00][0x3B]='Mark Of The Unicorn';
manufacturesExtended[0x00][0x3C]='Hotz Corporation';
manufacturesExtended[0x00][0x3D]='ETA Lighting';
manufacturesExtended[0x00][0x3E]='NSI Corporation';
manufacturesExtended[0x00][0x3F]='Ad Lib, Inc.';
manufacturesExtended[0x00][0x40]='Richmond Sound Design';
manufacturesExtended[0x00][0x41]='Microsoft';
manufacturesExtended[0x00][0x42]='Mindscape (Software Toolworks)';
manufacturesExtended[0x00][0x43]='Russ Jones Marketing / Niche';
manufacturesExtended[0x00][0x44]='Intone';
manufacturesExtended[0x00][0x45]='Advanced Remote Technologies';
manufacturesExtended[0x00][0x46]='White Instruments';
manufacturesExtended[0x00][0x47]='GT Electronics/Groove Tubes';
manufacturesExtended[0x00][0x48]='Pacific Research & Engineering';
manufacturesExtended[0x00][0x49]='Timeline Vista, Inc.';
manufacturesExtended[0x00][0x4A]='Mesa Boogie Ltd.';
manufacturesExtended[0x00][0x4B]='FSLI';
manufacturesExtended[0x00][0x4C]='Sequoia Development Group';
manufacturesExtended[0x00][0x4D]='Studio Electronics';
manufacturesExtended[0x00][0x4E]='Euphonix, Inc';
manufacturesExtended[0x00][0x4F]='InterMIDI, Inc.';
manufacturesExtended[0x00][0x50]='MIDI Solutions Inc.';
manufacturesExtended[0x00][0x51]='3DO Company';
manufacturesExtended[0x00][0x52]='Lightwave Research / High End Systems';
manufacturesExtended[0x00][0x53]='Micro-W Corporation';
manufacturesExtended[0x00][0x54]='Spectral Synthesis, Inc.';
manufacturesExtended[0x00][0x55]='Lone Wolf';
manufacturesExtended[0x00][0x56]='Studio Technologies Inc.';
manufacturesExtended[0x00][0x57]='Peterson Electro-Musical Product, Inc.';
manufacturesExtended[0x00][0x58]='Atari Corporation';
manufacturesExtended[0x00][0x59]='Marion Systems Corporation';
manufacturesExtended[0x00][0x5A]='Design Event';
manufacturesExtended[0x00][0x5B]='Winjammer Software Ltd.';
manufacturesExtended[0x00][0x5C]='AT&T Bell Laboratories';
manufacturesExtended[0x00][0x5D]='Reserved';
manufacturesExtended[0x00][0x5E]='Symetrix';
manufacturesExtended[0x00][0x5F]='MIDI the World';
manufacturesExtended[0x00][0x60]='Spatializer';
manufacturesExtended[0x00][0x61]='Micros \'N MIDI';
manufacturesExtended[0x00][0x62]='Accordians International';
manufacturesExtended[0x00][0x63]='EuPhonics (now 3Com)';
manufacturesExtended[0x00][0x64]='Musonix';
manufacturesExtended[0x00][0x65]='Turtle Beach Systems (Voyetra)';
manufacturesExtended[0x00][0x66]='Loud Technologies / Mackie';
manufacturesExtended[0x00][0x67]='Compuserve';
manufacturesExtended[0x00][0x68]='BEC Technologies';
manufacturesExtended[0x00][0x69]='QRS Music Inc';
manufacturesExtended[0x00][0x6A]='P.G. Music';
manufacturesExtended[0x00][0x6B]='Sierra Semiconductor';
manufacturesExtended[0x00][0x6C]='EpiGraf';
manufacturesExtended[0x00][0x6D]='Electronics Diversified Inc';
manufacturesExtended[0x00][0x6E]='Tune 1000';
manufacturesExtended[0x00][0x6F]='Advanced Micro Devices';
manufacturesExtended[0x00][0x70]='Mediamation';
manufacturesExtended[0x00][0x71]='Sabine Musical Mfg. Co. Inc.';
manufacturesExtended[0x00][0x72]='Woog Labs';
manufacturesExtended[0x00][0x73]='Micropolis Corp';
manufacturesExtended[0x00][0x74]='Ta Horng Musical Instrument';
manufacturesExtended[0x00][0x75]='e-Tek Labs (Forte Tech)';
manufacturesExtended[0x00][0x76]='Electro-Voice';
manufacturesExtended[0x00][0x77]='Midisoft Corporation';
manufacturesExtended[0x00][0x78]='QSound Labs';
manufacturesExtended[0x00][0x79]='Westrex';
manufacturesExtended[0x00][0x7A]='Nvidia';
manufacturesExtended[0x00][0x7B]='ESS Technology';
manufacturesExtended[0x00][0x7C]='Media Trix Peripherals';
manufacturesExtended[0x00][0x7D]='Brooktree Corp';
manufacturesExtended[0x00][0x7E]='Otari Corp';
manufacturesExtended[0x00][0x7F]='Key Electronics, Inc.';
manufacturesExtended[0x01][0x00]='Shure Incorporated';
manufacturesExtended[0x01][0x01]='AuraSound';
manufacturesExtended[0x01][0x02]='Crystal Semiconductor';
manufacturesExtended[0x01][0x03]='Conexant (Rockwell)';
manufacturesExtended[0x01][0x04]='Silicon Graphics';
manufacturesExtended[0x01][0x05]='M-Audio (Midiman)';
manufacturesExtended[0x01][0x06]='PreSonus';
manufacturesExtended[0x01][0x08]='Topaz Enterprises';
manufacturesExtended[0x01][0x09]='Cast Lighting';
manufacturesExtended[0x01][0x0A]='Microsoft';
manufacturesExtended[0x01][0x0B]='Sonic Foundry';
manufacturesExtended[0x01][0x0C]='Line 6 (Fast Forward)';
manufacturesExtended[0x01][0x0D]='Beatnik Inc';
manufacturesExtended[0x01][0x0E]='Van Koevering Company';
manufacturesExtended[0x01][0x0F]='Altech Systems';
manufacturesExtended[0x01][0x10]='S & S Research';
manufacturesExtended[0x01][0x11]='VLSI Technology';
manufacturesExtended[0x01][0x12]='Chromatic Research';
manufacturesExtended[0x01][0x13]='Sapphire';
manufacturesExtended[0x01][0x14]='IDRC';
manufacturesExtended[0x01][0x15]='Justonic Tuning';
manufacturesExtended[0x01][0x16]='TorComp Research Inc.';
manufacturesExtended[0x01][0x17]='Newtek Inc.';
manufacturesExtended[0x01][0x18]='Sound Sculpture';
manufacturesExtended[0x01][0x19]='Walker Technical';
manufacturesExtended[0x01][0x1A]='Digital Harmony (PAVO)';
manufacturesExtended[0x01][0x1B]='InVision Interactive';
manufacturesExtended[0x01][0x1C]='T-Square Design';
manufacturesExtended[0x01][0x1D]='Nemesys Music Technology';
manufacturesExtended[0x01][0x1E]='DBX Professional (Harman Intl)';
manufacturesExtended[0x01][0x1F]='Syndyne Corporation';
manufacturesExtended[0x01][0x20]='Bitheadz';
manufacturesExtended[0x01][0x21]='Cakewalk Music Software';
manufacturesExtended[0x01][0x22]='Analog Devices';
manufacturesExtended[0x01][0x23]='National Semiconductor';
manufacturesExtended[0x01][0x24]='Boom Theory / Adinolfi Alternative Percussion';
manufacturesExtended[0x01][0x25]='Virtual DSP Corporation';
manufacturesExtended[0x01][0x26]='Antares Systems';
manufacturesExtended[0x01][0x27]='Angel Software';
manufacturesExtended[0x01][0x28]='St Louis Music';
manufacturesExtended[0x01][0x29]='Passport Music Software LLC (Gvox)';
manufacturesExtended[0x01][0x2A]='Ashley Audio Inc.';
manufacturesExtended[0x01][0x2B]='Vari-Lite Inc.';
manufacturesExtended[0x01][0x2C]='Summit Audio Inc.';
manufacturesExtended[0x01][0x2D]='Aureal Semiconductor Inc.';
manufacturesExtended[0x01][0x2E]='SeaSound LLC';
manufacturesExtended[0x01][0x2F]='U.S. Robotics';
manufacturesExtended[0x01][0x30]='Aurisis Research';
manufacturesExtended[0x01][0x31]='Nearfield Research';
manufacturesExtended[0x01][0x32]='FM7 Inc';
manufacturesExtended[0x01][0x33]='Swivel Systems';
manufacturesExtended[0x01][0x34]='Hyperactive Audio Systems';
manufacturesExtended[0x01][0x35]='MidiLite (Castle Studios Productions)';
manufacturesExtended[0x01][0x36]='Radikal Technologies';
manufacturesExtended[0x01][0x37]='Roger Linn Design';
manufacturesExtended[0x01][0x38]='TC-Helicon Vocal Technologies';
manufacturesExtended[0x01][0x39]='Event Electronics';
manufacturesExtended[0x01][0x3A]='Sonic Network Inc';
manufacturesExtended[0x01][0x3B]='Realtime Music Solutions';
manufacturesExtended[0x01][0x3C]='Apogee Digital';
manufacturesExtended[0x01][0x3D]='Classical Organs, Inc.';
manufacturesExtended[0x01][0x3E]='Microtools Inc.';
manufacturesExtended[0x01][0x3F]='Numark Industries';
manufacturesExtended[0x01][0x40]='Frontier Design Group, LLC';
manufacturesExtended[0x01][0x41]='Recordare LLC';
manufacturesExtended[0x01][0x42]='Starr Labs';
manufacturesExtended[0x01][0x43]='Voyager Sound Inc.';
manufacturesExtended[0x01][0x44]='Manifold Labs';
manufacturesExtended[0x01][0x45]='Aviom Inc.';
manufacturesExtended[0x01][0x46]='Mixmeister Technology';
manufacturesExtended[0x01][0x47]='Notation Software';
manufacturesExtended[0x01][0x48]='Mercurial Communications';
manufacturesExtended[0x01][0x49]='Wave Arts';
manufacturesExtended[0x01][0x4A]='Logic Sequencing Devices';
manufacturesExtended[0x01][0x4B]='Axess Electronics';
manufacturesExtended[0x01][0x4C]='Muse Research';
manufacturesExtended[0x01][0x4D]='Open Labs';
manufacturesExtended[0x01][0x4E]='Guillemot Corp';
manufacturesExtended[0x01][0x4F]='Samson Technologies';
manufacturesExtended[0x01][0x50]='Electronic Theatre Controls';
manufacturesExtended[0x01][0x51]='Blackberry (RIM)';
manufacturesExtended[0x01][0x52]='Mobileer';
manufacturesExtended[0x01][0x53]='Synthogy';
manufacturesExtended[0x01][0x54]='Lynx Studio Technology Inc.';
manufacturesExtended[0x01][0x55]='Damage Control Engineering LLC';
manufacturesExtended[0x01][0x56]='Yost Engineering, Inc.';
manufacturesExtended[0x01][0x57]='Brooks & Forsman Designs LLC / DrumLite';
manufacturesExtended[0x01][0x58]='Infinite Response';
manufacturesExtended[0x01][0x59]='Garritan Corp';
manufacturesExtended[0x01][0x5A]='Plogue Art et Technologie, Inc';
manufacturesExtended[0x01][0x5B]='RJM Music Technology';
manufacturesExtended[0x01][0x5C]='Custom Solutions Software';
manufacturesExtended[0x01][0x5D]='Sonarcana LLC / Highly Liquid';
manufacturesExtended[0x01][0x5E]='Centrance';
manufacturesExtended[0x01][0x5F]='Kesumo LLC';
manufacturesExtended[0x01][0x60]='Stanton (Gibson)';
manufacturesExtended[0x01][0x61]='Livid Instruments';
manufacturesExtended[0x01][0x62]='First Act / 745 Media';
manufacturesExtended[0x01][0x63]='Pygraphics, Inc.';
manufacturesExtended[0x01][0x64]='Panadigm Innovations Ltd';
manufacturesExtended[0x01][0x65]='Avedis Zildjian Co';
manufacturesExtended[0x01][0x66]='Auvital Music Corp';
manufacturesExtended[0x01][0x67]='You Rock Guitar (was: Inspired Instruments)';
manufacturesExtended[0x01][0x68]='Chris Grigg Designs';
manufacturesExtended[0x01][0x69]='Slate Digital LLC';
manufacturesExtended[0x01][0x6A]='Mixware';
manufacturesExtended[0x01][0x6B]='Social Entropy';
manufacturesExtended[0x01][0x6C]='Source Audio LLC';
manufacturesExtended[0x01][0x6D]='Ernie Ball / Music Man';
manufacturesExtended[0x01][0x6E]='Fishman';
manufacturesExtended[0x01][0x6F]='Custom Audio Electronics';
manufacturesExtended[0x01][0x70]='American Audio/DJ';
manufacturesExtended[0x01][0x71]='Mega Control Systems';
manufacturesExtended[0x01][0x72]='Kilpatrick Audio';
manufacturesExtended[0x01][0x73]='iConnectivity';
manufacturesExtended[0x01][0x74]='Fractal Audio';
manufacturesExtended[0x01][0x75]='NetLogic Microsystems';
manufacturesExtended[0x01][0x76]='Music Computing';
manufacturesExtended[0x01][0x77]='Nektar Technology Inc';
manufacturesExtended[0x01][0x78]='Zenph Sound Innovations';
manufacturesExtended[0x01][0x79]='DJTechTools.com';
manufacturesExtended[0x01][0x7A]='Rezonance Labs';
manufacturesExtended[0x01][0x7B]='Decibel Eleven';
manufacturesExtended[0x01][0x7C]='CNMAT';
manufacturesExtended[0x01][0x7D]='Media Overkill';
manufacturesExtended[0x01][0x7E]='Confusionists LLC';
manufacturesExtended[0x01][0x7F]='moForte Inc';
manufacturesExtended[0x02][0x00]='Miselu Inc';
manufacturesExtended[0x02][0x01]='Amelia\'s Compass LLC';
manufacturesExtended[0x02][0x02]='Zivix LLC';
manufacturesExtended[0x02][0x03]='Artiphon';
manufacturesExtended[0x02][0x04]='Synclavier Digital';
manufacturesExtended[0x02][0x05]='Light & Sound Control Devices LLC';
manufacturesExtended[0x02][0x06]='Retronyms Inc';
manufacturesExtended[0x02][0x07]='JS Technologies';
manufacturesExtended[0x02][0x08]='Quicco Sound';
manufacturesExtended[0x02][0x09]='A-Designs Audio';
manufacturesExtended[0x02][0x0A]='McCarthy Music Corp';
manufacturesExtended[0x02][0x0B]='Denon DJ';
manufacturesExtended[0x02][0x0C]='Keith Robert Murray';
manufacturesExtended[0x02][0x0D]='Google';
manufacturesExtended[0x02][0x0E]='ISP Technologies';
manufacturesExtended[0x02][0x0F]='Abstrakt Instruments LLC';
manufacturesExtended[0x02][0x10]='Meris LLC';
manufacturesExtended[0x02][0x11]='Sensorpoint LLC';
manufacturesExtended[0x02][0x12]='Hi-Z Labs';
manufacturesExtended[0x02][0x13]='Imitone';
manufacturesExtended[0x02][0x14]='Intellijel Designs Inc.';
manufacturesExtended[0x02][0x15]='Dasz Instruments Inc.';
manufacturesExtended[0x02][0x16]='Remidi';
manufacturesExtended[0x02][0x17]='Disaster Area Designs LLC';
manufacturesExtended[0x02][0x18]='Universal Audio';
manufacturesExtended[0x02][0x19]='Carter Duncan Corp';
manufacturesExtended[0x02][0x1A]='Essential Technology';
manufacturesExtended[0x02][0x1B]='Cantux Research LLC';
manufacturesExtended[0x02][0x1C]='Hummel Technologies';
manufacturesExtended[0x02][0x1D]='Sensel Inc';
manufacturesExtended[0x02][0x1E]='DBML Group';
manufacturesExtended[0x02][0x1F]='Madrona Labs';
manufacturesExtended[0x02][0x20]='Mesa Boogie';
manufacturesExtended[0x02][0x21]='Effigy Labs';
manufacturesExtended[0x02][0x22]='MK2 Image Ltd';
manufacturesExtended[0x02][0x23]='Red Panda LLC';
manufacturesExtended[0x02][0x24]='OnSong LLC';
manufacturesExtended[0x02][0x25]='Jamboxx Inc.';
manufacturesExtended[0x02][0x26]='Electro-Harmonix';
manufacturesExtended[0x02][0x27]='RnD64 Inc';
manufacturesExtended[0x02][0x28]='Neunaber Technology LLC';
manufacturesExtended[0x02][0x29]='Kaom Inc.';
manufacturesExtended[0x02][0x2A]='Hallowell EMC';
manufacturesExtended[0x02][0x2B]='Sound Devices, LLC';

manufacturesExtended[0x20][0x00]='Dream SAS';
manufacturesExtended[0x20][0x01]='Strand Lighting';
manufacturesExtended[0x20][0x02]='Amek Div of Harman Industries';
manufacturesExtended[0x20][0x03]='Casa Di Risparmio Di Loreto';
manufacturesExtended[0x20][0x04]='Böhm electronic GmbH';
manufacturesExtended[0x20][0x05]='Syntec Digital Audio';
manufacturesExtended[0x20][0x06]='Trident Audio Developments';
manufacturesExtended[0x20][0x07]='Real World Studio';
manufacturesExtended[0x20][0x08]='Evolution Synthesis, Ltd';
manufacturesExtended[0x20][0x09]='Yes Technology';
manufacturesExtended[0x20][0x0A]='Audiomatica';
manufacturesExtended[0x20][0x0B]='Bontempi SpA (Sigma)';
manufacturesExtended[0x20][0x0C]='F.B.T. Elettronica SpA';
manufacturesExtended[0x20][0x0D]='MidiTemp GmbH';
manufacturesExtended[0x20][0x0E]='LA Audio (Larking Audio)';
manufacturesExtended[0x20][0x0F]='Zero 88 Lighting Limited';
manufacturesExtended[0x20][0x10]='Micon Audio Electronics GmbH';
manufacturesExtended[0x20][0x11]='Forefront Technology';
manufacturesExtended[0x20][0x12]='Studio Audio and Video Ltd.';
manufacturesExtended[0x20][0x13]='Kenton Electronics';
manufacturesExtended[0x20][0x14]='Celco/ Electrosonic';
manufacturesExtended[0x20][0x15]='ADB';
manufacturesExtended[0x20][0x16]='Marshall Products Limited';
manufacturesExtended[0x20][0x17]='DDA';
manufacturesExtended[0x20][0x18]='BSS Audio Ltd.';
manufacturesExtended[0x20][0x19]='MA Lighting Technology';
manufacturesExtended[0x20][0x1A]='Fatar SRL c/o Music Industries';
manufacturesExtended[0x20][0x1B]='QSC Audio Products Inc.';
manufacturesExtended[0x20][0x1C]='Artisan Clasic Organ Inc.';
manufacturesExtended[0x20][0x1D]='Orla Spa';
manufacturesExtended[0x20][0x1E]='Pinnacle Audio (Klark Teknik PLC)';
manufacturesExtended[0x20][0x1F]='TC Electronics';
manufacturesExtended[0x20][0x20]='Doepfer Musikelektronik GmbH';
manufacturesExtended[0x20][0x21]='Creative ATC / E-mu';
manufacturesExtended[0x20][0x22]='Seyddo/Minami';
manufacturesExtended[0x20][0x23]='LG Electronics (Goldstar)';
manufacturesExtended[0x20][0x24]='Midisoft sas di M.Cima & C';
manufacturesExtended[0x20][0x25]='Samick Musical Inst. Co. Ltd.';
manufacturesExtended[0x20][0x26]='Penny and Giles (Bowthorpe PLC)';
manufacturesExtended[0x20][0x27]='Acorn Computer';
manufacturesExtended[0x20][0x28]='LSC Electronics Pty. Ltd.';
manufacturesExtended[0x20][0x29]='Focusrite/Novation';
manufacturesExtended[0x20][0x2A]='Samkyung Mechatronics';
manufacturesExtended[0x20][0x2B]='Medeli Electronics Co.';
manufacturesExtended[0x20][0x2C]='Charlie Lab SRL';
manufacturesExtended[0x20][0x2D]='Blue Chip Music Technology';
manufacturesExtended[0x20][0x2E]='BEE OH Corp';
manufacturesExtended[0x20][0x2F]='LG Semicon America';
manufacturesExtended[0x20][0x30]='TESI';
manufacturesExtended[0x20][0x31]='EMAGIC';
manufacturesExtended[0x20][0x32]='Behringer GmbH';
manufacturesExtended[0x20][0x33]='Access Music Electronics';
manufacturesExtended[0x20][0x34]='Synoptic';
manufacturesExtended[0x20][0x35]='Hanmesoft';
manufacturesExtended[0x20][0x36]='Terratec Electronic GmbH';
manufacturesExtended[0x20][0x37]='Proel SpA';
manufacturesExtended[0x20][0x38]='IBK MIDI';
manufacturesExtended[0x20][0x39]='IRCAM';
manufacturesExtended[0x20][0x3A]='Propellerhead Software';
manufacturesExtended[0x20][0x3B]='Red Sound Systems Ltd';
manufacturesExtended[0x20][0x3C]='Elektron ESI AB';
manufacturesExtended[0x20][0x3D]='Sintefex Audio';
manufacturesExtended[0x20][0x3E]='MAM (Music and More)';
manufacturesExtended[0x20][0x3F]='Amsaro GmbH';
manufacturesExtended[0x20][0x40]='CDS Advanced Technology BV (Lanbox)';
manufacturesExtended[0x20][0x41]='Mode Machines (Touched By Sound GmbH)';
manufacturesExtended[0x20][0x42]='DSP Arts';
manufacturesExtended[0x20][0x43]='Phil Rees Music Tech';
manufacturesExtended[0x20][0x44]='Stamer Musikanlagen GmbH';
manufacturesExtended[0x20][0x45]='Musical Muntaner S.A. dba Soundart';
manufacturesExtended[0x20][0x46]='C-Mexx Software';
manufacturesExtended[0x20][0x47]='Klavis Technologies';
manufacturesExtended[0x20][0x48]='Noteheads AB';
manufacturesExtended[0x20][0x49]='Algorithmix';
manufacturesExtended[0x20][0x4A]='Skrydstrup R&D';
manufacturesExtended[0x20][0x4B]='Professional Audio Company';
manufacturesExtended[0x20][0x4C]='NewWave Labs (MadWaves)';
manufacturesExtended[0x20][0x4D]='Vermona';
manufacturesExtended[0x20][0x4E]='Nokia';
manufacturesExtended[0x20][0x4F]='Wave Idea';
manufacturesExtended[0x20][0x50]='Hartmann GmbH';
manufacturesExtended[0x20][0x51]='Lion\'s Tracs';
manufacturesExtended[0x20][0x52]='Analogue Systems';
manufacturesExtended[0x20][0x53]='Focal-JMlab';
manufacturesExtended[0x20][0x54]='Ringway Electronics (Chang-Zhou) Co Ltd';
manufacturesExtended[0x20][0x55]='Faith Technologies (Digiplug)';
manufacturesExtended[0x20][0x56]='Showworks';
manufacturesExtended[0x20][0x57]='Manikin Electronic';
manufacturesExtended[0x20][0x58]='1 Come Tech';
manufacturesExtended[0x20][0x59]='Phonic Corp';
manufacturesExtended[0x20][0x5A]='Dolby Australia (Lake)';
manufacturesExtended[0x20][0x5B]='Silansys Technologies';
manufacturesExtended[0x20][0x5C]='Winbond Electronics';
manufacturesExtended[0x20][0x5D]='Cinetix Medien und Interface GmbH';
manufacturesExtended[0x20][0x5E]='A&G Soluzioni Digitali';
manufacturesExtended[0x20][0x5F]='Sequentix Music Systems';
manufacturesExtended[0x20][0x60]='Oram Pro Audio';
manufacturesExtended[0x20][0x61]='Be4 Ltd';
manufacturesExtended[0x20][0x62]='Infection Music';
manufacturesExtended[0x20][0x63]='Central Music Co. (CME)';
manufacturesExtended[0x20][0x64]='genoQs Machines GmbH';
manufacturesExtended[0x20][0x65]='Medialon';
manufacturesExtended[0x20][0x66]='Waves Audio Ltd';
manufacturesExtended[0x20][0x67]='Jerash Labs';
manufacturesExtended[0x20][0x68]='Da Fact';
manufacturesExtended[0x20][0x69]='Elby Designs';
manufacturesExtended[0x20][0x6A]='Spectral Audio';
manufacturesExtended[0x20][0x6B]='Arturia';
manufacturesExtended[0x20][0x6C]='Vixid';
manufacturesExtended[0x20][0x6D]='C-Thru Music';
manufacturesExtended[0x20][0x6E]='Ya Horng Electronic Co LTD';
manufacturesExtended[0x20][0x6F]='SM Pro Audio';
manufacturesExtended[0x20][0x70]='OTO MACHINES';
manufacturesExtended[0x20][0x71]='ELZAB S.A. (G LAB)';
manufacturesExtended[0x20][0x72]='Blackstar Amplification Ltd';
manufacturesExtended[0x20][0x73]='M3i Technologies GmbH';
manufacturesExtended[0x20][0x74]='Gemalto (from Xiring)';
manufacturesExtended[0x20][0x75]='Prostage SL';
manufacturesExtended[0x20][0x76]='Teenage Engineering';
manufacturesExtended[0x20][0x77]='Tobias Erichsen Consulting';
manufacturesExtended[0x20][0x78]='Nixer Ltd';
manufacturesExtended[0x20][0x79]='Hanpin Electron Co Ltd';
manufacturesExtended[0x20][0x7A]='"MIDI-hardware" R.Sowa';
manufacturesExtended[0x20][0x7B]='Beyond Music Industrial Ltd';
manufacturesExtended[0x20][0x7C]='Kiss Box B.V.';
manufacturesExtended[0x20][0x7D]='Misa Digital Technologies Ltd';
manufacturesExtended[0x20][0x7E]='AI Musics Technology Inc';
manufacturesExtended[0x20][0x7F]='Serato Inc LP';
manufacturesExtended[0x21][0x00]='Limex';
manufacturesExtended[0x21][0x01]='Kyodday (Tokai)';
manufacturesExtended[0x21][0x02]='Mutable Instruments';
manufacturesExtended[0x21][0x03]='PreSonus Software Ltd';
manufacturesExtended[0x21][0x04]='Ingenico (was Xiring)';
manufacturesExtended[0x21][0x05]='Fairlight Instruments Pty Ltd';
manufacturesExtended[0x21][0x06]='Musicom Lab';
manufacturesExtended[0x21][0x07]='Modal Electronics (Modulus/VacoLoco)';
manufacturesExtended[0x21][0x08]='RWA (Hong Kong) Limited';
manufacturesExtended[0x21][0x09]='Native Instruments';
manufacturesExtended[0x21][0x0A]='Naonext';
manufacturesExtended[0x21][0x0B]='MFB';
manufacturesExtended[0x21][0x0C]='Teknel Research';
manufacturesExtended[0x21][0x0D]='Ploytec GmbH';
manufacturesExtended[0x21][0x0E]='Surfin Kangaroo Studio';
manufacturesExtended[0x21][0x0F]='Philips Electronics HK Ltd';
manufacturesExtended[0x21][0x10]='ROLI Ltd';
manufacturesExtended[0x21][0x11]='Panda-Audio Ltd';
manufacturesExtended[0x21][0x12]='BauM Software';
manufacturesExtended[0x21][0x13]='Machinewerks Ltd.';
manufacturesExtended[0x21][0x14]='Xiamen Elane Electronics';
manufacturesExtended[0x21][0x15]='Marshall Amplification PLC';
manufacturesExtended[0x21][0x16]='Kiwitechnics Ltd';
manufacturesExtended[0x21][0x17]='Rob Papen';
manufacturesExtended[0x21][0x18]='Spicetone OU';
manufacturesExtended[0x21][0x19]='V3Sound';
manufacturesExtended[0x21][0x1A]='IK Multimedia';
manufacturesExtended[0x21][0x1B]='Novalia Ltd';
manufacturesExtended[0x21][0x1C]='Modor Music';
manufacturesExtended[0x21][0x1D]='Ableton';
manufacturesExtended[0x21][0x1E]='Dtronics';
manufacturesExtended[0x21][0x1F]='ZAQ Audio';
manufacturesExtended[0x21][0x20]='Muabaobao Education Technology Co Ltd';
manufacturesExtended[0x21][0x21]='Flux Effects';
manufacturesExtended[0x21][0x22]='Audiothingies (MCDA)';
manufacturesExtended[0x21][0x23]='Retrokits';
manufacturesExtended[0x21][0x24]='Morningstar FX Pte Ltd';
manufacturesExtended[0x21][0x25]='Changsha Hotone Audio Co Ltd';
manufacturesExtended[0x21][0x26]='Expressive';
manufacturesExtended[0x21][0x27]='Expert Sleepers Ltd';
manufacturesExtended[0x21][0x28]='Timecode-Vision Technology';
manufacturesExtended[0x21][0x29]='Hornberg Research GbR';
manufacturesExtended[0x21][0x2A]='Sonic Potions';
manufacturesExtended[0x21][0x2B]='Audiofront';
manufacturesExtended[0x21][0x2C]='Fred\'s Lab';
manufacturesExtended[0x21][0x2D]='Audio Modeling';
manufacturesExtended[0x21][0x2E]='C. Bechstein Digital GmbH';
manufacturesExtended[0x21][0x2F]='Motas Electronics Ltd';
manufacturesExtended[0x21][0x30]='MIND Music Labs';
manufacturesExtended[0x21][0x31]='Sonic Academy Ltd';
manufacturesExtended[0x21][0x32]='Bome Software';
manufacturesExtended[0x21][0x33]='AODYO SAS';
manufacturesExtended[0x21][0x34]='Pianoforce S.R.O';
manufacturesExtended[0x21][0x35]='Dreadbox P.C.';
manufacturesExtended[0x21][0x36]='TouchKeys Instruments Ltd';
manufacturesExtended[0x21][0x37]='The Gigrig Ltd';
manufacturesExtended[0x21][0x38]='ALM Co';
manufacturesExtended[0x21][0x39]='CH Sound Design';
manufacturesExtended[0x21][0x3A]='Beat Bars';

manufacturesExtended[0x40][0x00]='Crimson Technology Inc.';
manufacturesExtended[0x40][0x01]='Softbank Mobile Corp';
manufacturesExtended[0x40][0x03]='D&M Holdings Inc.';

const manuList = {...manufacturer};
Object.keys(manufacturesExtended).map(b1=>{
    Object.keys(manufacturesExtended[b1]).map(b2=>{
        manuList[(1 <<15) + (parseInt(b1)<<8) + parseInt(b2)] = manufacturesExtended[b1][b2];
    });
});

exports.getManufacturer16bit = (manufacturerId, universalSysex = false)=>{
    let manufacturerId16;
    if(universalSysex) {
        if (manufacturerId[0] === 0){
            manufacturerId16 = (1 <<15) + (manufacturerId[1]<<8) + manufacturerId[2];
            manufacturerId = manufacturerId.slice(0,1);
        }else{
            manufacturerId16 =  manufacturerId[0];
        }
    }else { //MIDICI
        if (manufacturerId[1] === 0 && manufacturerId[2] === 0) {
            manufacturerId16 = manufacturerId[0];
        }else{
            manufacturerId16 = (1 <<15) + (manufacturerId[1]<<8) + manufacturerId[2];
        }
    }

    return {
        manufacturerId16,
        manufacturerId,
        name: manuList[manufacturerId16] || ''
    };
}
exports.getManufacturerBy16bitId = (manufacturerId16, universalSysex)=>{
    let manufacturerId=[];
    if(universalSysex) {
        if(manufacturerId16<128){
            manufacturerId.push(manufacturerId16);
        }else{
            manufacturerId.push(0x00, manufacturerId16 & 0x7F, (manufacturerId16 >> 8) & 0x7F);
        }
    }else { //MIDICI
        if (manufacturerId16 < 128) {
            manufacturerId.push(manufacturerId16,0x00,0x00);
        } else {
            manufacturerId.push(0x00, manufacturerId16 & 0x7F, (manufacturerId16 >> 8) & 0x7F);
        }
    }
    return {
        manufacturerId16,
        manufacturerId,
        name: manuList[manufacturerId16] || ''
    };
}