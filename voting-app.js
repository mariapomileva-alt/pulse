const { SUPABASE_URL, SUPABASE_ANON_KEY } = window;
const supabaseLib = window.supabase;
const supabase = supabaseLib && SUPABASE_URL && SUPABASE_ANON_KEY
    ? supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const landingView = document.getElementById("landingView");
const createView = document.getElementById("createView");
const publishView = document.getElementById("publishView");
const respondView = document.getElementById("respondView");
const resultsView = document.getElementById("resultsView");
const thankYouView = document.getElementById("thankYouView");

const startCreateBtn = document.getElementById("startCreateBtn");
const pulseForm = document.getElementById("pulseForm");
const pulseTitle = document.getElementById("pulseTitle");
const pulseCadence = document.getElementById("pulseCadence");
const questionsContainer = document.getElementById("questionsContainer");
const addQuestionBtn = document.getElementById("addQuestionBtn");
const anonymousToggle = document.getElementById("anonymousToggle");
const collectEmailToggle = document.getElementById("collectEmailToggle");
const collectPhoneToggle = document.getElementById("collectPhoneToggle");
const pulseFormMessage = document.getElementById("pulseFormMessage");

const publishLink = document.getElementById("publishLink");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const downloadQrBtn = document.getElementById("downloadQrBtn");
const viewResultsBtn = document.getElementById("viewResultsBtn");
const qrCodeImage = document.getElementById("qrCodeImage");
const qrCodeFallback = document.getElementById("qrCodeFallback");
const recentPulses = document.getElementById("recentPulses");
const recentPulsesList = document.getElementById("recentPulsesList");
const usageStats = document.getElementById("usageStats");
const statsTotalPulses = document.getElementById("statsTotalPulses");
const statsTotalResponses = document.getElementById("statsTotalResponses");
const statsResponsesWeek = document.getElementById("statsResponsesWeek");
const OWNER_STATS_KEY = window.OWNER_STATS_KEY;

const respondTitle = document.getElementById("respondTitle");
const respondSubtitle = document.getElementById("respondSubtitle");
const respondIdentity = document.getElementById("respondIdentity");
const respondName = document.getElementById("respondName");
const respondEmailField = document.getElementById("respondEmailField");
const respondPhoneField = document.getElementById("respondPhoneField");
const respondEmail = document.getElementById("respondEmail");
const respondPhone = document.getElementById("respondPhone");
const questionCounter = document.getElementById("questionCounter");
const questionText = document.getElementById("questionText");
const answerOptions = document.getElementById("answerOptions");
const respondMessage = document.getElementById("respondMessage");

const resultsTitle = document.getElementById("resultsTitle");
const resultsSubtitle = document.getElementById("resultsSubtitle");
const resultsCharts = document.getElementById("resultsCharts");
const exportCsvBtn = document.getElementById("exportCsvBtn");

const brandHome = document.getElementById("brandHome");

const MAX_QUESTIONS = 5;
const MIN_SINGLE_OPTIONS = 2;
const MAX_SINGLE_OPTIONS = 3;
const SLUG_LENGTH = 7;
const ADMIN_KEY_LENGTH = 12;
const RECENT_PULSES_KEY = "fastpulse.recentPulses";
const RECENT_PULSES_LIMIT = 8;

const EMOJI_SCALE = [
    { label: "😴", value: 1 },
    { label: "😐", value: 2 },
    { label: "🙂", value: 3 },
    { label: "🔥", value: 4 },
];
const NUMBER_SCALE = [1, 2, 3, 4, 5];

let activePulse = null;
let activeAdminKey = null;
let respondState = {
    pulse: null,
    currentIndex: 0,
    responseId: null,
    runId: null,
};
let resultsCache = null;

const showView = (view) => {
    [landingView, createView, publishView, respondView, resultsView, thankYouView].forEach((item) => {
        item.classList.add("hidden");
    });
    view.classList.remove("hidden");
};

const generateToken = (length) => Math.random().toString(36).slice(2, 2 + length);

const getBaseUrl = () => {
    const { origin, pathname } = window.location;
    if (origin === "null") {
        const href = window.location.href.split("?")[0].split("#")[0];
        return href.replace(/\/(p|r)\/[^/]+$/, "").replace(/\/index\.html$/, "");
    }
    const basePath = pathname.replace(/\/(p|r)\/[^/]+$/, "").replace(/\/index\.html$/, "");
    return `${origin}${basePath}`.replace(/\/$/, "");
};

const buildPulseLink = (slug) => `${getBaseUrl()}?p=${slug}`;
const buildResultsLink = (slug, key) => `${getBaseUrl()}?r=${slug}&key=${key}`;

const getRoute = () => {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const params = new URLSearchParams(window.location.search);
    if (pathParts[0] === "p" && pathParts[1]) {
        return { mode: "respond", slug: pathParts[1] };
    }
    if (pathParts[0] === "r" && pathParts[1]) {
        return { mode: "results", slug: pathParts[1] };
    }
    if (params.get("p")) {
        return { mode: "respond", slug: params.get("p") };
    }
    if (params.get("r")) {
        return { mode: "results", slug: params.get("r") };
    }
    return { mode: "home", slug: null };
};

const createOptionRow = (value = "") => {
    const row = document.createElement("div");
    row.className = "option-row";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Option";
    input.value = value;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
        row.remove();
        updateOptionButtons(row.closest(".question-block"));
    });

    row.append(input, removeBtn);
    return row;
};

const updateOptionButtons = (questionBlock) => {
    if (!questionBlock) {
        return;
    }
    const rows = questionBlock.querySelectorAll(".option-row");
    rows.forEach((row, index) => {
        const button = row.querySelector("button");
        button.disabled = rows.length <= MIN_SINGLE_OPTIONS;
        button.style.opacity = rows.length <= MIN_SINGLE_OPTIONS ? "0.4" : "1";
        button.setAttribute("aria-label", `Remove option ${index + 1}`);
    });
    const addBtn = questionBlock.querySelector(".add-option-btn");
    if (addBtn) {
        addBtn.disabled = rows.length >= MAX_SINGLE_OPTIONS;
    }
};

const setOptionsEnabled = (questionBlock, enabled) => {
    const inputs = questionBlock.querySelectorAll(".option-row input");
    inputs.forEach((input) => {
        input.disabled = !enabled;
        input.required = enabled;
        if (!enabled) {
            input.value = input.value;
        }
    });
};

const createQuestionBlock = (index) => {
    const block = document.createElement("div");
    block.className = "question-block";

    const header = document.createElement("div");
    header.className = "question-header";
    header.textContent = `Question ${index + 1}`;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "link-btn";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
        if (questionsContainer.children.length > 1) {
            block.remove();
            refreshQuestionLabels();
        }
    });

    header.appendChild(removeBtn);

    const textField = document.createElement("label");
    textField.className = "field";
    textField.innerHTML = `
        <span>Question text</span>
        <input class="question-text" type="text" placeholder="How was your week?" required>
    `;

    const typeField = document.createElement("label");
    typeField.className = "field";
    typeField.innerHTML = `
        <span>Answer type</span>
        <select class="question-type">
            <option value="emoji">Emoji scale (😴 😐 🙂 🔥)</option>
            <option value="scale">1–5 scale</option>
            <option value="single">Single choice (max 3)</option>
            <option value="text">Written answer</option>
        </select>
    `;

    const optionsPanel = document.createElement("div");
    optionsPanel.className = "options-panel hidden";
    const optionsLabel = document.createElement("div");
    optionsLabel.className = "field";
    optionsLabel.innerHTML = "<span>Options</span>";
    const optionsList = document.createElement("div");
    optionsList.className = "options-list";
    optionsLabel.appendChild(optionsList);

    for (let i = 0; i < MIN_SINGLE_OPTIONS; i += 1) {
        optionsList.appendChild(createOptionRow());
    }

    const addOption = document.createElement("button");
    addOption.type = "button";
    addOption.className = "btn btn-secondary add-option-btn";
    addOption.textContent = "Add option";
    addOption.addEventListener("click", () => {
        if (optionsList.children.length < MAX_SINGLE_OPTIONS) {
            optionsList.appendChild(createOptionRow());
            updateOptionButtons(block);
        }
    });

    optionsPanel.append(optionsLabel, addOption);

    typeField.querySelector("select").addEventListener("change", (event) => {
        if (event.target.value === "single") {
            optionsPanel.classList.remove("hidden");
            setOptionsEnabled(block, true);
        } else {
            optionsPanel.classList.add("hidden");
            setOptionsEnabled(block, false);
        }
    });

    block.append(header, textField, typeField, optionsPanel);
    setOptionsEnabled(block, false);
    updateOptionButtons(block);
    return block;
};

const refreshQuestionLabels = () => {
    Array.from(questionsContainer.children).forEach((block, index) => {
        const header = block.querySelector(".question-header");
        if (header) {
            header.firstChild.textContent = `Question ${index + 1}`;
        }
    });
};

const initQuestionBlocks = () => {
    questionsContainer.innerHTML = "";
    questionsContainer.appendChild(createQuestionBlock(0));
};

const ensureSupabase = () => {
    if (supabase) {
        return true;
    }
    return false;
};

const fetchPulseBySlug = async (slug) => {
    if (!ensureSupabase()) {
        return null;
    }
    const { data: pulse, error } = await supabase
        .from("pulses")
        .select("id, title, slug, cadence, is_anonymous, collect_email, collect_phone, admin_key, created_at")
        .eq("slug", slug)
        .single();

    if (error || !pulse) {
        return null;
    }

    const { data: questions } = await supabase
        .from("questions")
        .select("id, text, type, position")
        .eq("pulse_id", pulse.id)
        .order("position", { ascending: true });

    const questionIds = (questions || []).map((question) => question.id);
    let options = [];
    if (questionIds.length) {
        const { data: optionRows } = await supabase
            .from("question_options")
            .select("id, question_id, label, value_number")
            .in("question_id", questionIds)
            .order("value_number", { ascending: true });
        options = optionRows || [];
    }

    const questionsWithOptions = (questions || []).map((question) => ({
        ...question,
        options: options.filter((option) => option.question_id === question.id),
    }));

    return { ...pulse, questions: questionsWithOptions };
};

const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getOrCreatePulseRun = async (pulse) => {
    if (!ensureSupabase()) {
        return null;
    }
    if (pulse.cadence === "one-time") {
        const { data: runs } = await supabase
            .from("pulse_runs")
            .select("id, started_at")
            .eq("pulse_id", pulse.id)
            .order("created_at", { ascending: false })
            .limit(1);
        if (runs && runs.length) {
            return runs[0];
        }
    }

    if (pulse.cadence === "weekly") {
        const weekStart = getWeekStart(new Date());
        const { data: runs } = await supabase
            .from("pulse_runs")
            .select("id, started_at")
            .eq("pulse_id", pulse.id)
            .gte("started_at", weekStart.toISOString())
            .order("created_at", { ascending: false })
            .limit(1);
        if (runs && runs.length) {
            return runs[0];
        }
        const { data: run } = await supabase
            .from("pulse_runs")
            .insert({ pulse_id: pulse.id, started_at: weekStart.toISOString() })
            .select()
            .single();
        return run;
    }

    const { data: run } = await supabase
        .from("pulse_runs")
        .insert({ pulse_id: pulse.id, started_at: new Date().toISOString() })
        .select()
        .single();
    return run;
};

const publishPulse = (pulse, adminKey) => {
    activePulse = pulse;
    activeAdminKey = adminKey;
    publishLink.value = buildPulseLink(pulse.slug);
    const encoded = encodeURIComponent(publishLink.value);
    qrCodeImage.onload = () => {
        qrCodeImage.classList.remove("hidden");
        qrCodeFallback?.classList.add("hidden");
    };
    qrCodeImage.onerror = () => {
        qrCodeImage.classList.add("hidden");
        qrCodeFallback?.classList.remove("hidden");
    };
    qrCodeImage.src = `https://quickchart.io/qr?text=${encoded}&size=180`;
    showView(publishView);
    saveRecentPulse(pulse, adminKey);
    renderRecentPulses();
};

const loadRecentPulses = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(RECENT_PULSES_KEY) || "[]");
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
};

const saveRecentPulse = (pulse, adminKey) => {
    const stored = loadRecentPulses();
    const filtered = stored.filter((item) => item.slug !== pulse.slug);
    const next = [
        {
            slug: pulse.slug,
            title: pulse.title,
            adminKey,
            cadence: pulse.cadence,
            createdAt: new Date().toISOString(),
        },
        ...filtered,
    ].slice(0, RECENT_PULSES_LIMIT);
    localStorage.setItem(RECENT_PULSES_KEY, JSON.stringify(next));
};

const renderRecentPulses = () => {
    if (!recentPulses || !recentPulsesList) {
        return;
    }
    const items = loadRecentPulses();
    if (!items.length) {
        recentPulses.classList.add("hidden");
        recentPulsesList.innerHTML = "";
        return;
    }
    recentPulses.classList.remove("hidden");
    recentPulsesList.innerHTML = "";
    items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "recent-item";
        const title = document.createElement("div");
        title.className = "recent-title";
        title.textContent = item.title || "Untitled pulse";
        const meta = document.createElement("div");
        meta.className = "recent-meta";
        meta.textContent = `${item.cadence || "one-time"} • ${new Date(item.createdAt).toLocaleDateString()}`;
        const actions = document.createElement("div");
        actions.className = "recent-actions";

        const openPulse = document.createElement("button");
        openPulse.type = "button";
        openPulse.className = "btn btn-secondary";
        openPulse.textContent = "Open pulse";
        openPulse.addEventListener("click", () => {
            window.location.href = buildPulseLink(item.slug);
        });

        const openResults = document.createElement("button");
        openResults.type = "button";
        openResults.className = "btn btn-primary";
        openResults.textContent = "View results";
        openResults.addEventListener("click", () => {
            window.location.href = buildResultsLink(item.slug, item.adminKey);
        });

        const copyAdmin = document.createElement("button");
        copyAdmin.type = "button";
        copyAdmin.className = "btn btn-secondary";
        copyAdmin.textContent = "Copy admin link";
        copyAdmin.addEventListener("click", async () => {
            const link = buildResultsLink(item.slug, item.adminKey);
            try {
                await navigator.clipboard.writeText(link);
                copyAdmin.textContent = "Copied";
            } catch (error) {
                copyAdmin.textContent = "Copied";
            }
            setTimeout(() => {
                copyAdmin.textContent = "Copy admin link";
            }, 1200);
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "icon-btn";
        deleteBtn.setAttribute("aria-label", "Remove from recent");
        deleteBtn.innerHTML = "🗑️";
        deleteBtn.addEventListener("click", () => {
            const next = loadRecentPulses().filter((entry) => entry.slug !== item.slug);
            localStorage.setItem(RECENT_PULSES_KEY, JSON.stringify(next));
            renderRecentPulses();
        });

        actions.append(openPulse, openResults, copyAdmin);
        const footer = document.createElement("div");
        footer.className = "recent-footer";
        footer.append(actions, deleteBtn);
        card.append(title, meta, footer);
        recentPulsesList.appendChild(card);
    });
};

const renderUsageStats = async () => {
    if (!usageStats || !ensureSupabase()) {
        return;
    }
    if (!OWNER_STATS_KEY || OWNER_STATS_KEY === "CHANGE_ME") {
        usageStats.classList.add("hidden");
        return;
    }
    const ownerParam = new URLSearchParams(window.location.search).get("owner");
    if (ownerParam !== OWNER_STATS_KEY) {
        usageStats.classList.add("hidden");
        return;
    }
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekIso = weekStart.toISOString();

    const [{ count: pulsesCount }, { count: responsesCount }, { count: weekCount }] = await Promise.all([
        supabase.from("pulses").select("id", { count: "exact", head: true }),
        supabase.from("responses").select("id", { count: "exact", head: true }),
        supabase.from("responses").select("id", { count: "exact", head: true }).gte("created_at", weekIso),
    ]);

    statsTotalPulses.textContent = String(pulsesCount ?? 0);
    statsTotalResponses.textContent = String(responsesCount ?? 0);
    statsResponsesWeek.textContent = String(weekCount ?? 0);
    usageStats.classList.remove("hidden");
};

const renderRespondQuestion = () => {
    if (!respondState.pulse) {
        return;
    }
    const { questions } = respondState.pulse;
    const currentQuestion = questions[respondState.currentIndex];
    if (!currentQuestion) {
        showView(thankYouView);
        return;
    }

    questionCounter.textContent = `Question ${respondState.currentIndex + 1} of ${questions.length}`;
    questionText.textContent = currentQuestion.text;
    answerOptions.innerHTML = "";
    respondMessage.textContent = "";

    let options = [];
    if (currentQuestion.type === "emoji") {
        options = EMOJI_SCALE.map((item) => ({
            label: item.label,
            valueNumber: item.value,
        }));
    } else if (currentQuestion.type === "scale") {
        options = NUMBER_SCALE.map((value) => ({
            label: String(value),
            valueNumber: value,
        }));
    } else if (currentQuestion.type === "single") {
        options = (currentQuestion.options || []).map((option) => ({
            label: option.label,
            optionId: option.id,
        }));
    } else if (currentQuestion.type === "text") {
        const wrapper = document.createElement("div");
        wrapper.className = "answer-text";
        const input = document.createElement("textarea");
        input.rows = 4;
        input.placeholder = "Your answer";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn btn-primary btn-large";
        button.textContent = "Submit answer";
        button.addEventListener("click", async () => {
            respondMessage.textContent = "";
            const textValue = input.value.trim();
            if (!textValue) {
                respondMessage.textContent = "Please write an answer.";
                input.focus();
                return;
            }
            if (!respondState.responseId) {
                const name = respondName.value.trim();
                const email = respondEmail.value.trim();
                const phone = respondPhone.value.trim();
                if (!respondState.pulse.is_anonymous && !name) {
                    respondMessage.textContent = "Please enter your name.";
                    respondName.focus();
                    return;
                }
                if (respondState.pulse.collect_email && !email) {
                    respondMessage.textContent = "Please enter your email.";
                    respondEmail.focus();
                    return;
                }
                if (respondState.pulse.collect_phone && !phone) {
                    respondMessage.textContent = "Please enter your phone.";
                    respondPhone.focus();
                    return;
                }
                const run = await getOrCreatePulseRun(respondState.pulse);
                if (!run) {
                    respondMessage.textContent = "Could not start this pulse. Try again.";
                    return;
                }
                respondState.runId = run.id;
                const { data: response, error } = await supabase
                    .from("responses")
                    .insert({
                        pulse_id: respondState.pulse.id,
                        pulse_run_id: run.id,
                        respondent_label: respondState.pulse.is_anonymous ? null : name,
                        respondent_email: respondState.pulse.collect_email ? email : null,
                        respondent_phone: respondState.pulse.collect_phone ? phone : null,
                    })
                    .select()
                    .single();
                if (error || !response) {
                    respondMessage.textContent = "Something went wrong. Try again.";
                    return;
                }
                respondState.responseId = response.id;
            }
            const payload = {
                response_id: respondState.responseId,
                question_id: currentQuestion.id,
                option_id: null,
                value_number: null,
                value_text: textValue,
            };
            const { error } = await supabase.from("response_values").insert(payload);
            if (error) {
                respondMessage.textContent = "Could not save your response. Try again.";
                return;
            }
            respondState.currentIndex += 1;
            renderRespondQuestion();
        });
        wrapper.append(input, button);
        answerOptions.appendChild(wrapper);
        return;
    }

    options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-button";
        button.textContent = option.label;
        button.addEventListener("click", async () => {
            respondMessage.textContent = "";
            if (!respondState.responseId) {
                const name = respondName.value.trim();
                const email = respondEmail.value.trim();
                const phone = respondPhone.value.trim();
                if (!respondState.pulse.is_anonymous && !name) {
                    respondMessage.textContent = "Please enter your name.";
                    respondName.focus();
                    return;
                }
                if (respondState.pulse.collect_email && !email) {
                    respondMessage.textContent = "Please enter your email.";
                    respondEmail.focus();
                    return;
                }
                if (respondState.pulse.collect_phone && !phone) {
                    respondMessage.textContent = "Please enter your phone.";
                    respondPhone.focus();
                    return;
                }
                const run = await getOrCreatePulseRun(respondState.pulse);
                if (!run) {
                    respondMessage.textContent = "Could not start this pulse. Try again.";
                    return;
                }
                respondState.runId = run.id;
                const { data: response, error } = await supabase
                    .from("responses")
                    .insert({
                        pulse_id: respondState.pulse.id,
                        pulse_run_id: run.id,
                        respondent_label: respondState.pulse.is_anonymous ? null : name,
                        respondent_email: respondState.pulse.collect_email ? email : null,
                        respondent_phone: respondState.pulse.collect_phone ? phone : null,
                    })
                    .select()
                    .single();
                if (error || !response) {
                    respondMessage.textContent = "Something went wrong. Try again.";
                    return;
                }
                respondState.responseId = response.id;
            }

            const payload = {
                response_id: respondState.responseId,
                question_id: currentQuestion.id,
                option_id: option.optionId || null,
                value_number: option.valueNumber ?? null,
                value_text: option.valueText || option.label || null,
            };

            const { error } = await supabase.from("response_values").insert(payload);
            if (error) {
                respondMessage.textContent = "Could not save your response. Try again.";
                return;
            }

            respondState.currentIndex += 1;
            renderRespondQuestion();
        });
        answerOptions.appendChild(button);
    });
};

const setupRespondView = async (slug) => {
    const pulse = await fetchPulseBySlug(slug);
    if (!pulse) {
        respondTitle.textContent = "Pulse not found";
        respondSubtitle.textContent = supabase
            ? "Check the link or ask for a new one."
            : "Supabase is not configured. Add keys in config.js.";
        respondIdentity.classList.add("hidden");
        answerOptions.innerHTML = "";
        showView(respondView);
        return;
    }
    respondState = { pulse, currentIndex: 0, responseId: null, runId: null };
    respondTitle.textContent = pulse.title;
    respondSubtitle.textContent = "One tap per answer.";
    if (pulse.is_anonymous && !pulse.collect_email && !pulse.collect_phone) {
        respondIdentity.classList.add("hidden");
    } else {
        respondIdentity.classList.remove("hidden");
    }
    if (pulse.is_anonymous) {
        respondName.value = "";
        respondName.closest(".field")?.classList.add("hidden");
    } else {
        respondName.closest(".field")?.classList.remove("hidden");
    }
    if (pulse.collect_email) {
        respondEmailField.classList.remove("hidden");
    } else {
        respondEmailField.classList.add("hidden");
        respondEmail.value = "";
    }
    if (pulse.collect_phone) {
        respondPhoneField.classList.remove("hidden");
    } else {
        respondPhoneField.classList.add("hidden");
        respondPhone.value = "";
    }
    showView(respondView);
    renderRespondQuestion();
};

const renderCharts = (pulse, questions, responses, responseValues, runs) => {
    resultsCharts.innerHTML = "";
    const responseMap = new Map(responses.map((response) => [response.id, response]));
    const responsesByRun = new Map();
    responses.forEach((response) => {
        if (!responsesByRun.has(response.pulse_run_id)) {
            responsesByRun.set(response.pulse_run_id, []);
        }
        responsesByRun.get(response.pulse_run_id).push(response.id);
    });

    const useWeekly = pulse.cadence === "weekly" && runs.length > 1;
    const runLabels = runs.map((run) =>
        new Date(run.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    );

    questions.forEach((question) => {
        const card = document.createElement("div");
        card.className = "chart-card";
        const title = document.createElement("div");
        title.className = "chart-title";
        title.textContent = question.text;
        const canvas = document.createElement("canvas");
        canvas.className = "chart-canvas";
        canvas.height = 220;
        card.append(title, canvas);
        resultsCharts.appendChild(card);

        const values = responseValues.filter((value) => value.question_id === question.id);

        if (!useWeekly) {
            let labels = [];
            let data = [];
            if (question.type === "single") {
                labels = (question.options || []).map((option) => option.label);
                data = (question.options || []).map(
                    (option) => values.filter((value) => value.option_id === option.id).length,
                );
            } else if (question.type === "emoji") {
                labels = EMOJI_SCALE.map((item) => item.label);
                data = EMOJI_SCALE.map(
                    (item) => values.filter((value) => value.value_number === item.value).length,
                );
            } else if (question.type === "scale") {
                labels = NUMBER_SCALE.map((item) => String(item));
                data = NUMBER_SCALE.map(
                    (item) => values.filter((value) => value.value_number === item).length,
                );
            } else if (question.type === "text") {
                const list = document.createElement("div");
                list.className = "text-answers";
                const items = values
                    .map((value) => value.value_text)
                    .filter(Boolean)
                    .slice(-10)
                    .reverse();
                if (!items.length) {
                    const empty = document.createElement("div");
                    empty.className = "empty-state";
                    empty.textContent = "No written responses yet.";
                    list.appendChild(empty);
                } else {
                    items.forEach((text) => {
                        const row = document.createElement("div");
                        row.className = "text-answer";
                        row.textContent = text;
                        list.appendChild(row);
                    });
                }
                card.appendChild(list);
                return;
            }

            new Chart(canvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Responses",
                            data,
                            backgroundColor: "rgba(255, 59, 59, 0.8)",
                            borderRadius: 999,
                            borderSkipped: false,
                            maxBarThickness: 48,
                            categoryPercentage: 0.6,
                            barPercentage: 0.7,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    aspectRatio: 2.4,
                    plugins: {
                        legend: { display: false },
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: "#5a6b7f" },
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0, color: "#5a6b7f" },
                            grid: { color: "rgba(11, 45, 91, 0.08)" },
                        },
                    },
                },
            });
            return;
        }

        if (question.type === "single") {
            const datasets = (question.options || []).map((option, index) => ({
                label: option.label,
                data: runs.map((run) => {
                    const ids = responsesByRun.get(run.id) || [];
                    return values.filter(
                        (value) => ids.includes(value.response_id) && value.option_id === option.id,
                    ).length;
                }),
                borderColor: index % 2 === 0 ? "rgba(255, 59, 59, 0.9)" : "rgba(11, 45, 91, 0.7)",
                backgroundColor: "rgba(255, 59, 59, 0.1)",
                tension: 0.3,
            }));
            new Chart(canvas.getContext("2d"), {
                type: "line",
                data: {
                    labels: runLabels,
                    datasets,
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true },
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } },
                    },
                },
            });
            return;
        }

        const scaleValues = question.type === "emoji" ? EMOJI_SCALE.map((item) => item.value) : NUMBER_SCALE;
        const averages = runs.map((run) => {
            const ids = new Set(responsesByRun.get(run.id) || []);
            const runValues = values.filter((value) => ids.has(value.response_id) && value.value_number != null);
            if (!runValues.length) {
                return null;
            }
            const total = runValues.reduce((sum, item) => sum + item.value_number, 0);
            return total / runValues.length;
        });

        new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
                labels: runLabels,
                datasets: [
                    {
                        label: "Average",
                        data: averages,
                        borderColor: "rgba(255, 59, 59, 0.9)",
                        backgroundColor: "rgba(255, 59, 59, 0.1)",
                        tension: 0.3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        suggestedMin: Math.min(...scaleValues),
                        suggestedMax: Math.max(...scaleValues),
                        ticks: { precision: 0 },
                    },
                },
            },
        });
    });
};

const setupResultsView = async (slug) => {
    if (!ensureSupabase()) {
        resultsTitle.textContent = "Results unavailable";
        resultsSubtitle.textContent = "Supabase is not configured. Add keys in config.js.";
        exportCsvBtn.classList.add("hidden");
        showView(resultsView);
        return;
    }
    const pulse = await fetchPulseBySlug(slug);
    if (!pulse) {
        resultsTitle.textContent = "Results not found";
        resultsSubtitle.textContent = "Check the link or create a new pulse.";
        exportCsvBtn.classList.add("hidden");
        showView(resultsView);
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const key = params.get("key");
    if (pulse.admin_key && key !== pulse.admin_key) {
        resultsTitle.textContent = "Private results";
        resultsSubtitle.textContent = "This link is not valid. Ask the creator for a new one.";
        exportCsvBtn.classList.add("hidden");
        showView(resultsView);
        return;
    }

    resultsTitle.textContent = `${pulse.title} results`;
    resultsSubtitle.textContent = pulse.cadence === "weekly" ? "Weekly trend included." : "One-time results.";
    exportCsvBtn.classList.remove("hidden");

    const questionIds = pulse.questions.map((question) => question.id);
    const { data: responses } = await supabase
        .from("responses")
        .select("id, pulse_run_id, created_at, respondent_label, respondent_email, respondent_phone")
        .eq("pulse_id", pulse.id)
        .order("created_at", { ascending: true });

    const { data: runs } = await supabase
        .from("pulse_runs")
        .select("id, started_at")
        .eq("pulse_id", pulse.id)
        .order("started_at", { ascending: true });

    const { data: responseValues } = await supabase
        .from("response_values")
        .select("response_id, question_id, option_id, value_number, value_text")
        .in("question_id", questionIds);

    resultsCache = {
        pulse,
        questions: pulse.questions,
        responses: responses || [],
        responseValues: responseValues || [],
        runs: runs || [],
    };

    renderCharts(pulse, pulse.questions, responses || [], responseValues || [], runs || []);
    showView(resultsView);
};

const exportCsv = () => {
    if (!resultsCache) {
        return;
    }
    const { pulse, questions, responses, responseValues } = resultsCache;
    const responseMap = new Map(responses.map((response) => [response.id, response]));
    const questionMap = new Map(questions.map((question) => [question.id, question]));
    const optionMap = new Map();
    questions.forEach((question) => {
        (question.options || []).forEach((option) => optionMap.set(option.id, option));
    });

    const headers = ["timestamp", "question", "answer value", "pulse id", "name", "email", "phone"];
    const rows = responseValues.map((value) => {
        const response = responseMap.get(value.response_id);
        const question = questionMap.get(value.question_id);
        const option = value.option_id ? optionMap.get(value.option_id) : null;
        const answer = option?.label ?? value.value_text ?? value.value_number ?? "";
        return [
            response?.created_at ?? "",
            question?.text ?? "",
            answer,
            pulse.id,
            response?.respondent_label ?? "",
            response?.respondent_email ?? "",
            response?.respondent_phone ?? "",
        ];
    });

    const csvContent = [headers, ...rows]
        .map((row) => row.map((item) => `"${String(item ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fastpulse-${pulse.slug}-responses.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

const initCreateFlow = () => {
    initQuestionBlocks();
    window.fastpulseOpenCreate = () => {
        showView(createView);
    };
    startCreateBtn.addEventListener("click", () => {
        showView(createView);
    });
    addQuestionBtn.addEventListener("click", () => {
        if (questionsContainer.children.length < MAX_QUESTIONS) {
            questionsContainer.appendChild(createQuestionBlock(questionsContainer.children.length));
            refreshQuestionLabels();
        }
    });

    pulseForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        pulseFormMessage.textContent = "";

        if (!ensureSupabase()) {
            pulseFormMessage.textContent = "Supabase is not configured. Add keys in config.js.";
            return;
        }

        const title = pulseTitle.value.trim();
        const cadence = pulseCadence.value;
        const isAnonymous = anonymousToggle.checked;
        const collectEmail = collectEmailToggle.checked;
        const collectPhone = collectPhoneToggle.checked;

        if (!title) {
            pulseFormMessage.textContent = "Add a pulse title.";
            return;
        }

        const questionBlocks = Array.from(questionsContainer.querySelectorAll(".question-block"));
        const questions = questionBlocks.map((block) => {
            const text = block.querySelector(".question-text").value.trim();
            const type = block.querySelector(".question-type").value;
            const options = Array.from(block.querySelectorAll(".options-list input"))
                .map((input) => input.value.trim())
                .filter(Boolean);
            return { text, type, options };
        });

        if (questions.some((question) => !question.text)) {
            pulseFormMessage.textContent = "Every question needs text.";
            return;
        }

        const invalidSingle = questions.some(
            (question) =>
                question.type === "single" &&
                (question.options.length < MIN_SINGLE_OPTIONS || question.options.length > MAX_SINGLE_OPTIONS),
        );
        if (invalidSingle) {
            pulseFormMessage.textContent = "Single choice questions need 2–3 options.";
            return;
        }

        let slug = generateToken(SLUG_LENGTH);
        let adminKey = generateToken(ADMIN_KEY_LENGTH);
        let pulse = null;
        let lastError = null;

        for (let attempt = 0; attempt < 5; attempt += 1) {
            const { data, error } = await supabase
                .from("pulses")
                .insert({
                    title,
                    slug,
                    cadence,
                    is_anonymous: isAnonymous,
                    collect_email: collectEmail,
                    collect_phone: collectPhone,
                    admin_key: adminKey,
                })
                .select()
                .single();
            if (!error) {
                pulse = data;
                break;
            }
            lastError = error;
            slug = generateToken(SLUG_LENGTH);
            adminKey = generateToken(ADMIN_KEY_LENGTH);
        }

        if (!pulse) {
            const details = lastError?.message ? ` ${lastError.message}` : "";
            pulseFormMessage.textContent = `Could not create the pulse.${details}`;
            return;
        }

        const questionRows = questions.map((question, index) => ({
            pulse_id: pulse.id,
            text: question.text,
            type: question.type,
            position: index + 1,
        }));
        const { data: createdQuestions, error: questionError } = await supabase
            .from("questions")
            .insert(questionRows)
            .select();

        if (questionError || !createdQuestions) {
            pulseFormMessage.textContent = "Could not save questions.";
            return;
        }

        const optionRows = [];
        createdQuestions.forEach((question, index) => {
            const input = questions[index];
            if (input.type === "single") {
                input.options.forEach((label, optionIndex) => {
                    optionRows.push({
                        question_id: question.id,
                        label,
                        value_number: optionIndex + 1,
                    });
                });
            }
        });

        if (optionRows.length) {
            const { error: optionsError } = await supabase
                .from("question_options")
                .insert(optionRows);
            if (optionsError) {
                pulseFormMessage.textContent = "Could not save answer options.";
                return;
            }
        }

        const pulseWithQuestions = {
            ...pulse,
            questions: createdQuestions.map((question) => ({
                ...question,
                options: optionRows.filter((option) => option.question_id === question.id),
            })),
        };
        publishPulse(pulseWithQuestions, adminKey);
    });
};

if (brandHome) {
    brandHome.addEventListener("click", () => {
        window.location.href = getBaseUrl() || "/";
    });
    brandHome.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            window.location.href = getBaseUrl() || "/";
        }
    });
}

copyLinkBtn.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(publishLink.value);
    } catch (error) {
        publishLink.select();
        document.execCommand("copy");
    }
    copyLinkBtn.textContent = "Copied";
    setTimeout(() => {
        copyLinkBtn.textContent = "Copy link";
    }, 1500);
});

downloadQrBtn.addEventListener("click", () => {
    if (!qrCodeImage.src) {
        return;
    }
    const link = document.createElement("a");
    link.href = qrCodeImage.src;
    link.download = `fastpulse-${activePulse?.slug || "qr"}.png`;
    link.click();
});

viewResultsBtn.addEventListener("click", () => {
    if (activePulse && activeAdminKey) {
        window.location.href = buildResultsLink(activePulse.slug, activeAdminKey);
    }
});

exportCsvBtn.addEventListener("click", exportCsv);

const { mode, slug } = getRoute();
if (mode === "respond" && slug) {
    setupRespondView(slug);
} else if (mode === "results" && slug) {
    setupResultsView(slug);
} else {
    showView(landingView);
    initCreateFlow();
    renderRecentPulses();
    renderUsageStats();
}
