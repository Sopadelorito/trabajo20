
"use strict";

// =============================================
// MARTIAL ARTS WORLD
// =============================================

const YOUTUBE_API_KEY = "AIzaSyAN-wh7_Mk4OiXdyu-KkSc3ISF5GJBgGgc";

const WIKI_API = "https://es.wikipedia.org/w/api.php";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3/search";

const $ = id => document.getElementById(id);

async function getJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Error HTTP " + response.status);
    return response.json();
}

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

// =============================================
// DISCIPLINAS
// =============================================

const arts = {
    jiujitsu: {
        name: "Brazilian Jiu Jitsu",
        description: "Arte marcial centrada en la lucha en el suelo, el control posicional, las transiciones y las técnicas de sumisión.",
        techniques: "Armbar, Triangle Choke, Rear Naked Choke, Guard Pass",
        object: "Gi y faixa",
        champions: "IBJJF World Championship, ADCC y CBJJ"
    },
    muaythai: {
        name: "Muay Thai",
        description: "Arte marcial tailandesa conocida como el arte de las ocho extremidades. Utiliza puños, codos, rodillas y piernas.",
        techniques: "Jab, Teep, Roundhouse Kick, Elbow, Knee",
        object: "Guantes, vendas y prajiad",
        champions: "IFMA World Championships, Rajadamnern y Lumpinee"
    },
    grappling: {
        name: "Submission Grappling",
        description: "Modalidad de lucha que combina derribos, control, posiciones y sumisiones. Se practica habitualmente sin kimono.",
        techniques: "Single Leg, Double Leg, Heel Hook, Guillotine",
        object: "Rashguard y shorts",
        champions: "ADCC World Championship, CJI y Polaris"
    },
    judo: {
        name: "Judo",
        description: "Arte marcial japonés enfocado en proyecciones, inmovilizaciones, estrangulaciones y controles articulares.",
        techniques: "Seoi Nage, O Soto Gari, Uchi Mata, Osaekomi",
        object: "Judogi y cinturón",
        champions: "IJF World Championships y Juegos Olímpicos"
    },
    mma: {
        name: "Mixed Martial Arts",
        description: "Deporte de combate que integra golpeo, lucha, derribos, defensa y sumisiones.",
        techniques: "Jab, Takedown, Ground and Pound, Submission",
        object: "Guantes MMA y shorts",
        champions: "UFC, PFL y ONE Championship"
    }
};

// =============================================
// CAMBIO DE DISCIPLINA
// =============================================

let currentArt = "jiujitsu";

function selectArt(art) {
    if (!arts[art]) return;

    currentArt = art;

    document.querySelectorAll(".discipline-card").forEach(card => {
        card.classList.toggle("active", card.dataset.art === art);
    });

    const data = arts[art];

    $("disciplineInfo").innerHTML = `
        <h3>${escapeHTML(data.name)}</h3>
        <p>${escapeHTML(data.description)}</p>
        <br>
        <p><strong>Técnicas:</strong> ${escapeHTML(data.techniques)}</p>
        <p><strong>Equipamiento:</strong> ${escapeHTML(data.object)}</p>
        <p><strong>Campeonatos:</strong> ${escapeHTML(data.champions)}</p>
        <div class="art-equipment">
            <span class="eyebrow">EQUIPAMIENTO DE LA DISCIPLINA</span>
            <h4>Equipo y elementos principales</h4>
            <p>${escapeHTML(data.object)}</p>
        </div>
    `;

    $("techniqueArt").value = art;
    $("beltArt").value = art;

    renderBelts();
}

document.querySelectorAll(".discipline-card").forEach(card => {
    card.addEventListener("click", () => selectArt(card.dataset.art));
});

// =============================================
// WIKIPEDIA - BUSCADOR DE PELEADORES POR INICIAL
// =============================================

let fighterSearchTimer = null;
let fighterRequestNumber = 0;

function normalizeFighterText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("es");
}

function looksLikeFighter(person) {
    const text = normalizeFighterText([
        person.title,
        person.description,
        person.extract,
        ...(person.categories || []).map(category => category.title)
    ].join(" "));

    const excluded = /\b(organizacion|empresa|promocion|campeonato|torneo|federacion|videojuego|pelicula|serie de television|evento deportivo)\b/;

    if (excluded.test(text)) return false;

    const athleteTerms = /\b(peleador|luchador|boxeador|boxeadora|artista marcial|artes marciales|judoca|karateca|taekwondista|kickboxer|kickboxing|practicante de|deportista|atleta|competidor|competidora|mixed martial artist|martial artist|professional wrestler|wrestler|boxer|fighter|judoka|karate|taekwondo|jiu.?jitsu|muay thai|mma)\b/;

    return athleteTerms.test(text);
}

async function searchFighters() {
    const query = $("fighterSearch").value.trim();
    const container = $("fighterResults");
    const status = $("fighterStatus");
    const requestNumber = ++fighterRequestNumber;

    if (!query) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-user-ninja"></i>
                <p>Escribí una inicial o un nombre para buscar peleadores.</p>
            </div>
        `;

        status.textContent = "Buscador de peleadores listo";
        return;
    }

    container.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Buscando peleadores que empiezan con “${escapeHTML(query)}”...</p>
        </div>
    `;

    status.textContent = "Buscando atletas en Wikipedia...";

    try {
        const params = new URLSearchParams({
            action: "query",
            format: "json",
            origin: "*",
            generator: "prefixsearch",
            gpssearch: query,
            gpsnamespace: "0",
            gpslimit: "50",
            prop: "extracts|pageimages|info|description|categories",
            exintro: "1",
            explaintext: "1",
            exsentences: "3",
            piprop: "thumbnail",
            pithumbsize: "400",
            inprop: "url",
            cllimit: "20"
        });

        const data = await getJSON(`${WIKI_API}?${params}`);

        if (requestNumber !== fighterRequestNumber) return;

        const prefix = normalizeFighterText(query);

        const pages = Object.values(data.query?.pages || {})
            .filter(person =>
                normalizeFighterText(person.title).startsWith(prefix)
            )
            .filter(looksLikeFighter)
            .sort((a, b) => a.title.localeCompare(b.title, "es"));

        if (!pages.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <p>No encontramos peleadores cuyo nombre empiece con “${escapeHTML(query)}”.</p>
                    <p>Probá con otra letra o nombre.</p>
                </div>
            `;

            status.textContent = "No se encontraron peleadores";
            return;
        }

        container.innerHTML = pages.map(person => {
            const image = person.thumbnail?.source ||
                "https://placehold.co/500x350/111923/d8ae65?text=Fighter";

            return `
                <article class="fighter-card">
                    <img src="${escapeHTML(image)}"
                         alt="${escapeHTML(person.title)}"
                         loading="lazy">

                    <div class="fighter-info">
                        <span>WIKIPEDIA ATHLETE DATABASE</span>

                        <h3>${escapeHTML(person.title)}</h3>

                        <p>${escapeHTML(person.extract || person.description || "Biografía disponible en Wikipedia.")}</p>

                        <a href="${escapeHTML(person.fullurl || "https://es.wikipedia.org/")}"
                           target="_blank"
                           rel="noopener noreferrer">
                            VER BIOGRAFÍA →
                        </a>
                    </div>
                </article>
            `;
        }).join("");

        status.textContent = `${pages.length} peleadores encontrados (hasta 50 resultados de Wikipedia)`;

    } catch (error) {
        if (requestNumber !== fighterRequestNumber) return;

        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                <p>No se pudieron cargar los peleadores.</p>
                <p>Probá de nuevo o revisá tu conexión.</p>
            </div>
        `;

        status.textContent = "Error en Wikipedia";
    }
}

// Búsqueda automática mientras se escribe.
$("fighterSearch").addEventListener("input", () => {
    clearTimeout(fighterSearchTimer);
    fighterSearchTimer = setTimeout(searchFighters, 350);
});

// Botón BUSCAR.
$("searchFighter").addEventListener("click", () => {
    clearTimeout(fighterSearchTimer);
    searchFighters();
});

// Buscar al presionar ENTER.
$("fighterSearch").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        clearTimeout(fighterSearchTimer);
        searchFighters();
    }
});

// =============================================
// YOUTUBE - VIDEOS DE TÉCNICAS
// =============================================

const techniqueSuggestions = {
    jiujitsu: "Brazilian Jiu Jitsu techniques tutorial",
    muaythai: "Muay Thai techniques tutorial",
    grappling: "Submission grappling techniques tutorial",
    judo: "Judo throws techniques tutorial",
    mma: "MMA fighting techniques tutorial"
};

async function searchTechniques() {
    const art = $("techniqueArt").value;
    const term = $("techniqueSearch").value.trim();
    const container = $("videoResults");
    const status = $("videoStatus");

    if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "PEGÁ_ACÁ_TU_NUEVA_API_KEY") {
        status.textContent = "Falta configurar la API Key de YouTube.";

        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-brands fa-youtube"></i>
                <p>Configurá tu clave de YouTube Data API V3.</p>
            </div>
        `;

        return;
    }

    const query = term
        ? `${arts[art].name} ${term} technique tutorial`
        : techniqueSuggestions[art];

    container.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Buscando demostraciones...</p>
        </div>
    `;

    status.textContent = "Conectando con YouTube...";

    try {
        const params = new URLSearchParams({
            part: "snippet",
            q: query,
            type: "video",
            maxResults: "9",
            relevanceLanguage: "en",
            safeSearch: "strict",
            videoEmbeddable: "true",
            key: YOUTUBE_API_KEY
        });

        const data = await getJSON(`${YOUTUBE_API}?${params}`);
        const videos = data.items || [];

        if (!videos.length) throw new Error("No hay videos disponibles");

        container.innerHTML = videos.map(video => {
            const id = video.id.videoId;
            const title = video.snippet.title;

            return `
                <article class="video-card">
                    <iframe
                        src="https://www.youtube.com/embed/${encodeURIComponent(id)}"
                        title="${escapeHTML(title)}"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen>
                    </iframe>

                    <h3>${escapeHTML(title)}</h3>
                </article>
            `;
        }).join("");

        status.textContent = `${videos.length} videos encontrados`;

    } catch (error) {
        console.error(error);

        container.innerHTML = `
            <div class="empty-state">
                <p>No se pudieron obtener los videos.</p>
                <p>Revisá la API Key y los permisos de YouTube.</p>
            </div>
        `;

        status.textContent = "Error de YouTube";
    }
}

$("searchTechnique").addEventListener("click", searchTechniques);

$("techniqueSearch").addEventListener("keydown", event => {
    if (event.key === "Enter") searchTechniques();
});

// =============================================
// FAIXAS Y CINTURONES: ADULTOS Y JUVENILES
// =============================================

const beltSystems = {
    jiujitsu: {
        title: "Brazilian Jiu Jitsu",
        description: "Sistema de graduación BJJ. En juveniles se utilizan grupos de colores propios; la edad y los requisitos exactos dependen del reglamento vigente.",
        adult: [
            ["Blanca", "#f2f2f2", "Principiante", "Faixa inicial"],
            ["Azul", "#1265d4", "Fundamental", "Desarrollo de técnica y control"],
            ["Púrpura", "#7137a8", "Intermedio", "Mayor repertorio técnico"],
            ["Marrón", "#713c22", "Avanzado", "Preparación para faixa preta"],
            ["Negra", "#111111", "Maestría", "Grados y franjas según reglamento"]
        ],
        juvenile: [
            ["Blanca", "#f2f2f2", "Inicial", "Faixa blanca"],
            ["Gris y blanca", "#bfc3c7", "Juvenil", "Base gris con detalle blanco"],
            ["Gris", "#858b92", "Juvenil", "Faixa gris"],
            ["Gris y negra", "#626870", "Juvenil", "Base gris con detalle negro"],
            ["Amarilla y blanca", "#f0d83a", "Juvenil", "Base amarilla con detalle blanco"],
            ["Amarilla", "#e8c91c", "Juvenil", "Faixa amarilla"],
            ["Amarilla y negra", "#d5b617", "Juvenil", "Base amarilla con detalle negro"],
            ["Naranja y blanca", "#ef8c32", "Juvenil", "Base naranja con detalle blanco"],
            ["Naranja", "#e87519", "Juvenil", "Faixa naranja"],
            ["Naranja y negra", "#c95d12", "Juvenil", "Base naranja con detalle negro"],
            ["Verde y blanca", "#43a866", "Juvenil", "Base verde con detalle blanco"],
            ["Verde", "#168447", "Juvenil", "Faixa verde"],
            ["Verde y negra", "#126b3b", "Juvenil", "Base verde con detalle negro"]
        ]
    },

    muaythai: {
        title: "Muay Thai",
        description: "Muay Thai no tiene un sistema universal de cinturones. Se utiliza tradicionalmente el prajiad (brazalete); los niveles y colores dependen de cada escuela.",
        adult: [
            ["Prajiad", "#c52e36", "Brazalete tradicional", "Se lleva en el brazo; no es un cinturón"],
            ["Kru", "#d8ae65", "Instructor", "Título usado en algunas escuelas"],
            ["Kru Yai", "#98713f", "Instructor principal", "Reconocimiento variable"],
            ["Ajarn", "#e8e1d0", "Maestro", "Título tradicional variable"]
        ],
        juvenile: [
            ["Prajiad juvenil", "#c52e36", "Brazalete", "Uso simbólico según la escuela"],
            ["Nivel inicial", "#e8e1e0", "Fundamentos", "Técnica y seguridad"],
            ["Nivel intermedio", "#d8ae65", "Desarrollo", "Evaluación de la academia"]
        ]
    },

    grappling: {
        title: "Submission Grappling",
        description: "El grappling sin kimono no tiene una escala universal de faixas. Los niveles que aparecen son orientativos y dependen de cada academia o torneo.",
        adult: [
            ["Principiante", "#777777", "Fundamentos", "Posiciones y escapes"],
            ["Intermedio", "#3272ad", "Desarrollo", "Transiciones y control"],
            ["Avanzado", "#8549a9", "Experiencia", "Sistemas de sumisión"],
            ["Élite", "#d8ae65", "Competitivo", "Nivel deportivo orientativo"]
        ],
        juvenile: [
            ["Inicial", "#777777", "Fundamentos", "Progresión interna de academia"],
            ["Intermedio", "#3272ad", "Desarrollo", "Progresión interna de academia"],
            ["Avanzado", "#8549a9", "Experiencia", "Progresión interna de academia"]
        ]
    },

    judo: {
        title: "Judo",
        description: "Los colores y edades pueden variar según federación y país. La lista juvenil es una guía general, no una norma única para todas las asociaciones.",
        adult: [
            ["Blanca", "#f2f2f2", "6.º kyu", "Inicio"],
            ["Amarilla", "#e9cf38", "5.º kyu", "Grado kyu"],
            ["Naranja", "#ec852a", "4.º kyu", "Grado kyu"],
            ["Verde", "#319a50", "3.º kyu", "Grado kyu"],
            ["Azul", "#2470ce", "2.º kyu", "Grado kyu"],
            ["Marrón", "#713c22", "1.º kyu", "Previo al dan"],
            ["Negra", "#090909", "Dan", "Grados dan"]
        ],
        juvenile: [
            ["Blanca", "#f2f2f2", "Inicial", "Grado de inicio"],
            ["Amarilla", "#e9cf38", "Juvenil", "Según programa federativo"],
            ["Naranja", "#ec852a", "Juvenil", "Según programa federativo"],
            ["Verde", "#319a50", "Juvenil", "Según programa federativo"],
            ["Azul", "#2470ce", "Juvenil", "Según programa federativo"]
        ]
    },

    mma: {
        title: "Mixed Martial Arts",
        description: "MMA no tiene un sistema universal de cinturones. Los niveles son orientativos y los define cada gimnasio.",
        adult: [
            ["Principiante", "#777777", "Fundamentos", "Golpeo, lucha y defensa"],
            ["Intermedio", "#3272ad", "Técnica", "Integración de disciplinas"],
            ["Avanzado", "#8549a9", "Experiencia", "Dominio técnico"],
            ["Competitivo", "#d8ae65", "Deportivo", "No es una faixa oficial universal"]
        ],
        juvenile: [
            ["Inicial", "#777777", "Fundamentos", "Entrenamiento adaptado a la edad"],
            ["Intermedio", "#3272ad", "Desarrollo", "Evaluación de la academia"],
            ["Avanzado", "#8549a9", "Experiencia", "Evaluación de la academia"]
        ]
    }
};

let selectedBelt = null;

function renderBelts() {
    const art = $("beltArt").value;
    const category = $("beltCategory").value;
    const system = beltSystems[art];

    if (!system) return;

    const list = system[category] || system.adult;

    $("beltContent").innerHTML = `
        <div class="belt-intro">
            <h3>${escapeHTML(system.title)} · ${category === "juvenile" ? "Juveniles" : "Adultos"}</h3>
            <p>${escapeHTML(system.description)}</p>
        </div>

        <div class="belt-grid">
            ${list.map((belt, index) => `
                <button type="button"
                        class="belt-card ${index === 0 ? "selected" : ""}"
                        data-belt-index="${index}">
                    <span class="belt-mini" style="--belt-color:${belt[1]}"><i></i><b></b></span>
                    <strong>${escapeHTML(belt[0])}</strong>
                    <small>${escapeHTML(belt[2])}</small>
                    <p>${escapeHTML(belt[3])}</p>
                </button>
            `).join("")}
        </div>
    `;

    selectedBelt = list[0];
    updateBeltInfo();
    updateBeltModel();

    $("beltContent").querySelectorAll(".belt-card").forEach((card, index) => {
        card.addEventListener("click", () => {
            selectedBelt = list[index];

            $("beltContent").querySelectorAll(".belt-card").forEach(item => {
                item.classList.remove("selected");
            });

            card.classList.add("selected");
            updateBeltInfo();
            updateBeltModel();
        });
    });
}

function updateBeltInfo() {
    if (!selectedBelt) return;

    $("beltSelectedInfo").innerHTML = `
        <h3>${escapeHTML(selectedBelt[0])}</h3>
        <p><strong>${escapeHTML(selectedBelt[2])}</strong></p>
        <p>${escapeHTML(selectedBelt[3])}</p>
    `;
}

$("beltArt").addEventListener("change", renderBelts);
$("beltCategory").addEventListener("change", renderBelts);

// =============================================
// CAMPEONATOS IMPORTANTES
// =============================================

const championships = [
    {
        art: "JIU JITSU",
        name: "IBJJF World Championship",
        description: "Uno de los torneos más prestigiosos del Jiu Jitsu con kimono.",
        link: "https://ibjjf.com/events/championships"
    },
    {
        art: "GRAPPLING",
        name: "ADCC World Championship",
        description: "Uno de los escenarios más importantes del submission grappling.",
        link: "https://adcombat.com/"
    },
    {
        art: "MUAY THAI",
        name: "IFMA World Championships",
        description: "Campeonato internacional de Muay Thai amateur.",
        link: "https://www.ifmamuaythai.org/"
    },
    {
        art: "JUDO",
        name: "IJF World Championships",
        description: "Campeonato mundial organizado por la Federación Internacional de Judo.",
        link: "https://www.ijf.org/"
    },
    {
        art: "MMA",
        name: "UFC",
        description: "Una de las organizaciones de MMA profesional más reconocidas.",
        link: "https://www.ufc.com/"
    },
    {
        art: "MMA",
        name: "PFL",
        description: "Organización internacional de artes marciales mixtas.",
        link: "https://pflmma.com/"
    },
    {
        art: "MMA",
        name: "ONE Championship",
        description: "Organización internacional de deportes de combate.",
        link: "https://www.onefc.com/"
    }
];

$("championshipGrid").innerHTML = championships.map(champ => `
    <article class="champ-card">
        <span>${escapeHTML(champ.art)}</span>
        <h3>${escapeHTML(champ.name)}</h3>
        <p>${escapeHTML(champ.description)}</p>
        <a href="${escapeHTML(champ.link)}"
           target="_blank" rel="noopener noreferrer">
            VISITAR ORGANIZACIÓN →
        </a>
    </article>
`).join("");

// =============================================
// THREE.JS - MODELO 3D DE FAIXAS Y CINTURONES
// =============================================

let beltScene, beltCamera, beltRenderer, beltModel;
let beltRotating = true;
let beltAnimationStarted = false;

function beltMaterial(color, roughness = 0.88) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness: 0.02
    });
}

function updateBeltModel() {
    if (!beltScene || !selectedBelt) return;

    if (beltModel) beltScene.remove(beltModel);

    beltModel = new THREE.Group();

    const color = new THREE.Color(selectedBelt[1]);
    const fabric = beltMaterial(color);

    // Cuerpo principal de la faixa.
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(3.35, 0.22, 0.42),
        fabric
    );

    beltModel.add(body);

    // Extremos colgantes.
    const tailShape = new THREE.BoxGeometry(0.42, 0.20, 1.25);

    const leftTail = new THREE.Mesh(tailShape, fabric);
    leftTail.position.set(-1.38, -0.17, 0.66);
    leftTail.rotation.x = -0.12;
    beltModel.add(leftTail);

    const rightTail = new THREE.Mesh(tailShape, fabric);
    rightTail.position.set(1.38, -0.17, 0.66);
    rightTail.rotation.x = 0.12;
    beltModel.add(rightTail);

    // Costuras longitudinales.
    const seamMaterial = beltMaterial(0xe7e0d2);

    [-0.17, 0.17].forEach(z => {
        const seam = new THREE.Mesh(
            new THREE.BoxGeometry(3.28, 0.012, 0.014),
            seamMaterial
        );

        seam.position.set(0, 0.119, z);
        beltModel.add(seam);
    });

    // Pespuntes.
    for (let i = 0; i < 7; i++) {
        const stitch = new THREE.Mesh(
            new THREE.BoxGeometry(0.012, 0.014, 0.28),
            seamMaterial
        );

        stitch.position.set(-1.48 + i * 0.045, 0.12, 0);
        beltModel.add(stitch);
    }

    // Etiqueta de graduación.
    const patch = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.235, 0.055),
        beltMaterial(0x171717)
    );

    patch.position.set(-1.28, 0.02, 0.235);
    beltModel.add(patch);

    const rankStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.31, 0.08, 0.065),
        beltMaterial(0xf5f5f5)
    );

    rankStripe.position.set(-1.28, 0.15, 0.235);
    beltModel.add(rankStripe);

    // Nudo central.
    const knot = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.24, 0.48),
        fabric
    );

    knot.position.set(0, 0.13, 0.02);
    knot.rotation.y = 0.18;
    beltModel.add(knot);

    const fold = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.245, 0.49),
        fabric
    );

    fold.position.set(0.12, 0.15, 0.06);
    fold.rotation.y = -0.35;
    beltModel.add(fold);

    // Centrar y subir el modelo 3D.
    beltModel.rotation.x = -0.18;
    beltModel.rotation.y = -0.35;
    beltModel.position.y = 0.75;
    beltModel.position.z = 0;

    beltScene.add(beltModel);
}

function initBelt3D() {
    const canvas = $("beltCanvas");

    if (!canvas || !window.THREE) {
        if ($("beltSelectedInfo")) {
            $("beltSelectedInfo").textContent =
                "No se pudo cargar el visor 3D. Revisá tu conexión.";
        }

        return;
    }

    beltScene = new THREE.Scene();

    beltCamera = new THREE.PerspectiveCamera(
        38,
        canvas.clientWidth / Math.max(canvas.clientHeight, 1),
        0.1,
        100
    );

    // Cámara ajustada para mostrar mejor el cinturón.
    beltCamera.position.set(0, 2.1, 7.3);
    beltCamera.lookAt(0, 0.35, 0);

    beltRenderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true
    });

    beltRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    beltRenderer.setSize(canvas.clientWidth, canvas.clientHeight);

    beltScene.add(new THREE.AmbientLight(0xffffff, 1.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 5, 6);
    beltScene.add(keyLight);

    const fillLight = new THREE.PointLight(0xd8ae65, 0.8);
    fillLight.position.set(-4, 1, -3);
    beltScene.add(fillLight);

    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(2.4, 48),
        beltMaterial(0x172332)
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.15;
    beltScene.add(floor);

    updateBeltModel();

    if (!beltAnimationStarted) {
        beltAnimationStarted = true;
        animateBelt();
    }
}

function animateBelt() {
    requestAnimationFrame(animateBelt);

    if (!beltRenderer || !beltScene || !beltCamera) return;

    if (beltModel && beltRotating) {
        beltModel.rotation.y += 0.004;
    }

    beltRenderer.render(beltScene, beltCamera);
}

function resizeBelt3D() {
    const canvas = $("beltCanvas");

    if (!canvas || !beltRenderer || !beltCamera) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    if (!w || !h) return;

    beltCamera.aspect = w / h;
    beltCamera.updateProjectionMatrix();
    beltRenderer.setSize(w, h, false);
}

$("rotateBelt").addEventListener("click", () => {
    beltRotating = !beltRotating;
});

$("resetBelt").addEventListener("click", () => {
    if (beltModel) {
        beltModel.rotation.set(-0.18, -0.35, 0);
        beltModel.position.set(0, 0.75, 0);
    }
});

window.addEventListener("resize", resizeBelt3D);

// =============================================
// MENÚ RESPONSIVE
// =============================================

$("menuBtn").addEventListener("click", () => {
    $("nav").classList.toggle("active");
});

document.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", () => {
        $("nav").classList.remove("active");
    });
});

// =============================================
// INICIALIZACIÓN
// =============================================

document.addEventListener("DOMContentLoaded", () => {
    selectArt("jiujitsu");
    renderBelts();
    initBelt3D();
});
