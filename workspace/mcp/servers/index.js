/**
 * AXIOM Dissolved Tools Registry
 * Central aggregation of all 59 tool definitions organized by layer
 * @module tools/index
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { L00_TOOLS } from "./l00-infrastructure.js";
import { L01_TOOLS } from "./l01-language.js";
import { L02_TOOLS } from "./l02-input.js";
import { L03_TOOLS } from "./l03-network.js";
import { L04_TOOLS } from "./l04-cognitive.js";
import { L05_TOOLS } from "./l05-ethics.js";
import { L06_TOOLS } from "./l06-integration.js";
import { L07_TOOLS } from "./l07-reasoning.js";
import { L08_TOOLS } from "./l08-emotion.js";
import { L09_TOOLS } from "./l09-output.js";
import { L10_TOOLS } from "./l10-governance.js";
import { L11_TOOLS } from "./l11-performance.js";
import { L12_TOOLS } from "./l12-metacognitive.js";
import { L13_TOOLS } from "./l13-quantum.js";
/**
 * All AXIOM dissolved tools aggregated by layer
 * Total: 59 tools across 14 layers
 */
export var DISSOLVED_TOOLS = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([], L00_TOOLS, true), L01_TOOLS, true), L02_TOOLS, true), L03_TOOLS, true), L04_TOOLS, true), L05_TOOLS, true), L06_TOOLS, true), L07_TOOLS, true), L08_TOOLS, true), L09_TOOLS, true), L10_TOOLS, true), L11_TOOLS, true), L12_TOOLS, true), L13_TOOLS, true);
/**
 * Layer-organized exports for selective imports
 */
export { L00_TOOLS, L01_TOOLS, L02_TOOLS, L03_TOOLS, L04_TOOLS, L05_TOOLS, L06_TOOLS, L07_TOOLS, L08_TOOLS, L09_TOOLS, L10_TOOLS, L11_TOOLS, L12_TOOLS, L13_TOOLS, };
