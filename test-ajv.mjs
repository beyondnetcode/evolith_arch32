import Ajv from "ajv/dist/2020.js";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const draft7MetaSchema = require('ajv/dist/refs/json-schema-draft-07.json');
const ajv = new Ajv({ strict: false, allErrors: true });
ajv.addMetaSchema(draft7MetaSchema);
console.log("Success");
