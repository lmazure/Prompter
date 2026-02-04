
// DOM Elements
const datasetToggle = document.getElementById('dataset-toggle');
const systemPromptEl = document.getElementById('system-prompt-content');
const userPromptEl = document.getElementById('user-prompt-content');
const copySystemBtn = document.getElementById('copy-system');
const copyUserBtn = document.getElementById('copy-user');

// Prompt Parts
const SYSTEM_PROMPT_BASE = `You are an expert in manual software testing. You are responsible for defining the test cases necessary to validate a specific requirement. These test cases must be written in English. Ensure to include test cases for error scenarios and invalid inputs where relevant.

You must provide the test cases in JSON format as an array with the following format:
  {
    "testCases": [
      {
        "name": "test case name",
        "nature": "test case nature",
        "type": "test case type",
        "description": "high-level description of the test case",
        "prerequisites": "test case prerequisites",
        "testSteps": [
          {
            "action": "first action",
            "expectedResult": "expected result of the first action"
          },
          {
            "action": "second action",
            "expectedResult": "expected result of the second action"
          },
          ...
        ]
      },
      ...
    ]
  }

A test step can reference another by designating it as "first test step" or "test step 1", "second test step" or "test step 2"...

The "nature" field must have one of the following values:
- "functional": Testing of functionalities
- "business": Testing of business rules and processes
- "user": Testing from the user perspective
- "non functional": Testing of a system's usability and reliability
- "performance": Testing response time and system capacity
- "security": Testing of protection against vulnerabilities and unauthorized access
- "ATDD": Acceptance criteria driven testing

The "type" field must have one of the following values:
- "compliance": Testing adherence to standards or regulations
- "correction": Testing after a bug fix (to be used when the source of the requirement is set to “defect”)
- "evolution": Testing of newly added functionalities
- "regression": Testing that no existing functionality is broken
- "end-to-end": Testing of the complete end-user flow
- "partner": Integration testing with an external system
`;

const SYSTEM_PROMPT_DATASET = `
It is possible to parameterize actions and expected results using the syntax <parameter name>. In this case, the JSON must contain an additional "dataset" attribute that contains the values to use for the different test instantiations, for example:
  {
    "testCases": [
      {
        "name": "addition",
        "description": "addition test",
        "nature": "functional",
        "type": "evolution",
        "prerequisites": "",
        "testSteps": [
          {
            "action": "enter values <arg1> and <arg2>, then click on Add",
            "expectedResult": "the displayed total must be <total>"
          }
        ],
        "dataset": [
          {
            "arg1": 1,
            "arg2": 2,
            "arg3": 3
          },
          {
            "arg1": 1,
            "arg2": -2,
            "arg3": -1
          }
        ]
      },
      {
        "name": "subtraction",
        "description": "subtraction test",
        "prerequisites": "",
        "testSteps": [
          {
            "index": 0,
            "action": "enter values <arg1> and <arg2>, then click on Subtract",
            "expectedResult": "the displayed total must be <total>"
          }
        ],
        "dataset": [
          {
            "arg1": 1,
            "arg2": 2,
            "arg3": -1
          },
          {
            "arg1": 1,
            "arg2": -2,
            "arg3": 3
          }
        ]
      }
    ]
  }`;

const SYSTEM_PROMPT_FOOTER = `
Your response must contain nothing other than JSON! Do not use Markdown code blocks.`;

const USER_PROMPT_TEMPLATE = `## Requirement to be tested

{{#with requirement}}
The requirement is: "{{ name }}"

{{ description }}

Reference: {{reference}}
Category: {{ category }}
Nature: {{ nature }}
{{/with}}

## Additional information

In order to understand the context of that requirement, you need to consider:

### Related requirements
{{#if providedRequirements}}
{{#each providedRequirements}}
- {{ inc @index }} - "{{ name }}"

{{description}}

Reference: {{reference}}
Category: {{ category }}
Nature: {{ nature }}

{{/each}}
{{else}}
No related requirements provided.
{{/if}}

### Related documents
{{#if providedDocuments}}
{{#each providedDocuments}}
- {{ name }} {{! The user can manually add some information about the document here }}
{{/each}}
{{else}}
No related documents provided.
{{/if}}
`;

// Logic

function updatePrompts() {
    // 1. Build System Prompt
    let systemPrompt = SYSTEM_PROMPT_BASE;
    if (datasetToggle.checked) {
        systemPrompt += SYSTEM_PROMPT_DATASET;
    }
    systemPrompt += SYSTEM_PROMPT_FOOTER;
    
    systemPromptEl.innerText = systemPrompt.trim();

    // 2. Build User Prompt (Static for now)
    userPromptEl.innerText = USER_PROMPT_TEMPLATE.trim();
}

function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(text).then(() => {
        // Optional feedback could go here
        console.log('Copied to clipboard');
    });
}

// Event Listeners
datasetToggle.addEventListener('change', updatePrompts);
copySystemBtn.addEventListener('click', () => copyToClipboard('system-prompt-content'));
copyUserBtn.addEventListener('click', () => copyToClipboard('user-prompt-content'));

// Initial Render
updatePrompts();
