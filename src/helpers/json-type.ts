export type JsonValue = string | number | boolean | JsonObject | JsonArray;

interface JsonObject {
	[x: string]: JsonValue;
}

interface JsonArray extends Array<JsonValue> {}
