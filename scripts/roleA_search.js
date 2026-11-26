// Bryson: put your backtracking code here

// Temporary checker (or not, if sufficient). Feel free to replace with equivalent when integrating.
function isValid(region, colour, assignment, adjacency) {
    return adjacency[region].every(neighbour => assignment[neighbour] !== colour);
}

function shuffle(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function solve(map, options = {}) {
    const { stepLimit = 1000, randomize = false, guidance = {}, retries = 0,
        llmCalls = 0, checker = isValid } = options;
    if (!Number.isInteger(stepLimit) || stepLimit < 0) throw new Error('Invalid step limit');
    // Accept guidance only if it is a complete permutation of the original list.
    function order(values, suggested) {
        if (Array.isArray(suggested) && suggested.length === values.length &&
            new Set(suggested).size === values.length && suggested.every(v => values.includes(v))) {
            return [...suggested];
        }
        return randomize ? shuffle(values) : [...values];
    }
    const regions = order(map.regions, guidance.regionOrder);
    const colours = order(map.colours, guidance.colourOrder);
    const assignment = Object.create(null);
    let steps = 0, backtracks = 0;
    const conflicts = [];
    const trace = [];

    function backtrack(index) {
        if (index === regions.length) return 'solved';
        const region = regions[index];
        for (const colour of colours) {
            if (steps >= stepLimit) {
                return 'stalled';
                //reset step limit? stepLimit += initialStepLimit;
                //does llm solve the rest or just do a part?
                //llmCalls++;
                //return askLLM(assignment, map.adjacency);
            }
            steps++;
            if (!checker(region, colour, assignment, map.adjacency)) {
                conflicts.push(`${region} cannot be ${colour}`);
                continue;
            }
            assignment[region] = colour;
            trace.push({ action: 'assign', region, colour });
            const status = backtrack(index + 1);
            // Preserve the partial assignment when the budget runs out.
            if (status === 'unsatisfiable') {
                // undo and get ready to try the next colour
                delete assignment[region];
                backtracks++;
                trace.push({ action: 'undo', region, colour });
            }
            else // stalled or solved
                return status;
        }
        return 'unsatisfiable';
    }

    const status = backtrack(0);
    return { assignment: { ...assignment }, conflicts, steps, retries, llmCalls,
        status, backtracks, trace };
}

module.exports = { solve, isValid };


// n8n Code node (Run Once for All Items).
// Input may be a direct map or { map, options }; Webhook bodies are supported.
return $input.all().map(item => {
    const input = item.json.body ?? item.json;
    const map = input.map ?? input;
    const options = input.options ?? {};
    return { json: { map, options, ...solve(map, options) } };
});
