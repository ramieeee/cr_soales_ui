import fs from "node:fs";
import crypto from "node:crypto";

const popTemplates = [
  {
    population_summary: "Community-dwelling older adults without dementia.",
    target_population: "older_adults",
    age_band: "older",
    clinical_condition_tags: [],
    country_setting: "Italy",
    evidence: [
      { page: 3, quote: "Participants were community-dwelling adults aged 65–85 years." },
    ],
    confidence: 0.84,
  },
  {
    population_summary:
      "Older adults with mild cognitive impairment recruited from memory clinics.",
    target_population: "patients",
    age_band: "older",
    clinical_condition_tags: ["mild_cognitive_impairment"],
    country_setting: "Canada",
    evidence: [
      {
        page: 4,
        quote:
          "Individuals with mild cognitive impairment were included if they met Petersen criteria.",
      },
    ],
    confidence: 0.9,
  },
  {
    population_summary:
      "Middle-aged primary care patients with major depressive disorder.",
    target_population: "patients",
    age_band: "middle",
    clinical_condition_tags: ["depression"],
    country_setting: "Spain",
    evidence: [
      {
        page: 2,
        quote:
          "Patients with major depressive disorder were eligible if they met DSM-5 criteria.",
      },
    ],
    confidence: 0.86,
  },
  {
    population_summary: "Young adult undergraduate volunteers.",
    target_population: "young_adults",
    age_band: "young",
    clinical_condition_tags: [],
    country_setting: null,
    evidence: [{ page: 1, quote: "Participants aged 18–30 years were undergraduate volunteers." }],
    confidence: 0.78,
  },
  {
    population_summary:
      "Adults recruited through community advertisements spanning adulthood.",
    target_population: "general_population",
    age_band: "mixed",
    clinical_condition_tags: [],
    country_setting: "United Kingdom",
    evidence: [
      { page: 1, quote: "Participants aged 25–80 years were recruited through community advertisements." },
    ],
    confidence: 0.81,
  },
  {
    population_summary:
      "Adults with Parkinson disease recruited from a university hospital.",
    target_population: "patients",
    age_band: "older",
    clinical_condition_tags: ["parkinson_disease"],
    country_setting: "South Korea",
    evidence: [
      {
        page: 7,
        quote:
          "We enrolled patients with Parkinson’s disease (Hoehn and Yahr stages 1–3).",
      },
    ],
    confidence: 0.88,
  },
  {
    population_summary:
      "Older adults with Alzheimer disease recruited from memory clinics.",
    target_population: "patients",
    age_band: "older",
    clinical_condition_tags: ["alzheimer_disease"],
    country_setting: "United States",
    evidence: [
      {
        page: 10,
        quote:
          "Participants were individuals with clinically diagnosed Alzheimer’s disease (NIA-AA criteria).",
      },
    ],
    confidence: 0.9,
  },
  {
    population_summary:
      "Stroke survivors recruited during outpatient rehabilitation follow-up.",
    target_population: "patients",
    age_band: "mixed",
    clinical_condition_tags: ["stroke"],
    country_setting: "Netherlands",
    evidence: [
      {
        page: 12,
        quote:
          "We included stroke survivors recruited during outpatient rehabilitation follow-up.",
      },
    ],
    confidence: 0.85,
  },
  {
    population_summary: "Independently living older adults with dementia excluded.",
    target_population: "older_adults",
    age_band: "older",
    clinical_condition_tags: [],
    country_setting: "Japan",
    evidence: [{ page: 2, quote: "We excluded those with a diagnosis of dementia." }],
    confidence: 0.83,
  },
  {
    population_summary: "Adults with multiple sclerosis from an outpatient clinic.",
    target_population: "patients",
    age_band: "young",
    clinical_condition_tags: ["multiple_sclerosis"],
    country_setting: "Norway",
    evidence: [{ page: 2, quote: "We included patients with multiple sclerosis aged 22–49 years." }],
    confidence: 0.86,
  },
  {
    population_summary: "Adults with HIV recruited from an infectious disease clinic.",
    target_population: "patients",
    age_band: "older",
    clinical_condition_tags: ["hiv"],
    country_setting: "South Africa",
    evidence: [{ page: 9, quote: "Participants were adults with HIV recruited from an infectious disease clinic." }],
    confidence: 0.82,
  },
  {
    population_summary: "Community adults with hypertension recruited via primary care.",
    target_population: "patients",
    age_band: "older",
    clinical_condition_tags: ["hypertension"],
    country_setting: "Mexico",
    evidence: [{ page: 3, quote: "Participants were adults aged 60–76 years with hypertension recruited via primary care." }],
    confidence: 0.84,
  },
  {
    population_summary: "Working-age adults recruited from workplace wellness programs.",
    target_population: "general_population",
    age_band: "middle",
    clinical_condition_tags: [],
    country_setting: "Kenya",
    evidence: [{ page: 1, quote: "Participants were adults recruited from workplace wellness programs." }],
    confidence: 0.74,
  },
  {
    population_summary: "Older adults from nationwide registries.",
    target_population: "older_adults",
    age_band: "older",
    clinical_condition_tags: [],
    country_setting: "Sweden",
    evidence: [{ page: 1, quote: "We recruited community-dwelling adults aged 55–90 years from nationwide registries." }],
    confidence: 0.8,
  },
];

const instTemplates = [
  {
    instrument_name: "Cognitive Reserve Index questionnaire",
    instrument_family: ["CRIq"],
    detected_proxy_labels: ["education", "occupation", "leisure"],
    scoring_method: null,
    time_administration: "10–15 minutes",
    evidence: [
      {
        page: 6,
        quote:
          "Cognitive reserve was measured using the Cognitive Reserve Index questionnaire (CRIq).",
      },
    ],
    confidence: 0.9,
  },
  {
    instrument_name: "Cognitive Reserve Questionnaire",
    instrument_family: ["CRQ"],
    detected_proxy_labels: ["education", "occupation", "leisure", "social"],
    scoring_method: "Total score was calculated by summing item responses.",
    time_administration: null,
    evidence: [
      {
        page: 5,
        quote:
          "The Cognitive Reserve Questionnaire (CRQ) was completed during the first visit.",
      },
    ],
    confidence: 0.84,
  },
  {
    instrument_name: "Lifetime of Experiences Questionnaire",
    instrument_family: ["LEQ"],
    detected_proxy_labels: ["education", "occupation", "leisure", "social"],
    scoring_method: null,
    time_administration: null,
    evidence: [
      {
        page: 8,
        quote:
          "Cognitive reserve was assessed with the Lifetime of Experiences Questionnaire (LEQ).",
      },
    ],
    confidence: 0.86,
  },
  {
    instrument_name: "National Adult Reading Test",
    instrument_family: ["NART"],
    detected_proxy_labels: ["iq_proxy"],
    scoring_method:
      "Premorbid intelligence estimated from pronunciation accuracy of irregular words.",
    time_administration: "5–10 minutes",
    evidence: [
      {
        page: 4,
        quote: "Premorbid IQ was estimated using the National Adult Reading Test.",
      },
    ],
    confidence: 0.88,
  },
  {
    instrument_name: "Mehrfachwahl-Wortschatz-Intelligenztest",
    instrument_family: ["MWT-B"],
    detected_proxy_labels: ["iq_proxy"],
    scoring_method: null,
    time_administration: null,
    evidence: [
      {
        page: 11,
        quote:
          "The Mehrfachwahl-Wortschatz-Intelligenztest (MWT-B) was administered as an estimate of premorbid intelligence.",
      },
    ],
    confidence: 0.84,
  },
  {
    instrument_name: "Cognitive Reserve Scale",
    instrument_family: ["mCRS"],
    detected_proxy_labels: ["education", "occupation", "leisure", "social"],
    scoring_method: null,
    time_administration: "approximately 12 minutes",
    evidence: [
      { page: 3, quote: "Cognitive reserve was measured using the Cognitive Reserve Scale (mCRS)." },
    ],
    confidence: 0.83,
  },
  {
    instrument_name: "CRASH",
    instrument_family: ["CRASH"],
    detected_proxy_labels: ["education", "occupation", "leisure", "social"],
    scoring_method: null,
    time_administration: "10 minutes",
    evidence: [{ page: 10, quote: "Cognitive reserve was assessed with CRASH." }],
    confidence: 0.82,
  },
  {
    instrument_name: "CR-interview",
    instrument_family: ["CR-interview"],
    detected_proxy_labels: ["education", "occupation", "leisure"],
    scoring_method: "derived from structured questions",
    time_administration: null,
    evidence: [
      {
        page: 2,
        quote:
          "Cognitive reserve interview scores (CR-interview) were derived from structured questions.",
      },
    ],
    confidence: 0.74,
  },
  {
    instrument_name: null,
    instrument_family: ["multi_proxy_custom"],
    detected_proxy_labels: [
      "education",
      "occupation",
      "leisure",
      "multilingualism",
    ],
    scoring_method:
      "Composite reserve score computed by summing standardized proxy variables.",
    time_administration: null,
    evidence: [
      {
        page: 6,
        quote:
          "A composite reserve score was computed by summing standardized proxy variables.",
      },
    ],
    confidence: 0.78,
  },
  {
    instrument_name: null,
    instrument_family: ["not_detected"],
    detected_proxy_labels: [],
    scoring_method: null,
    time_administration: null,
    evidence: [
      {
        page: 2,
        quote: "No cognitive reserve instrument was reported in the Methods section.",
      },
    ],
    confidence: 0.65,
  },
];

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const baseTime = Date.parse("2026-03-11T09:00:00.000Z");
const rowCount = Number(process.env.SAMPLE_ROWS ?? "60");

const rows = Array.from({ length: rowCount }).map((_, index) => {
  const population = deepClone(popTemplates[index % popTemplates.length]);
  const instrument = deepClone(instTemplates[index % instTemplates.length]);

  population.evidence = (population.evidence ?? []).map((item) => ({
    ...item,
    page: Number(item.page) + (index % 3),
  }));

  instrument.evidence = (instrument.evidence ?? []).map((item) => ({
    ...item,
    page: Number(item.page) + (index % 4),
  }));

  const family = Array.isArray(instrument.instrument_family)
    ? instrument.instrument_family[0]
    : "not_detected";

  const status = family === "not_detected" ? "partial" : "success";

  return {
    id: crypto.randomUUID(),
    paper_id: crypto.randomUUID(),
    extraction_version:
      index % 3 === 0
        ? "v1"
        : index % 3 === 1
          ? "v2"
          : "prompt_hash:dev_sample",
    metadata_jsonb: {
      pipeline: "cr_extraction",
      model: "gpt-5.2",
      prompt_family: "population_instrument",
      run_id: `sample_run_${String(index + 1).padStart(3, "0")}`,
    },
    study_design_jsonb: {},
    sample_jsonb: { population, instrument },
    outcomes_jsonb: {},
    risk_of_bias_jsonb: {},
    extraction_timestamp: new Date(baseTime + index * 5 * 60_000).toISOString(),
    status,
  };
});

fs.mkdirSync("test", { recursive: true });
fs.writeFileSync(
  "test/extractions.sample.json",
  JSON.stringify({ extractions: rows }, null, 2),
);

console.log(`Wrote ${rows.length} rows to test/extractions.sample.json`);
