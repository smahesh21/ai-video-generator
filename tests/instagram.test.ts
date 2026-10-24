import assert from "node:assert/strict";
import test from "node:test";
import {randomBytes} from "node:crypto";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {decryptInstagramToken,encryptInstagramToken}=require("../apps/studio/lib/instagram-crypto") as typeof import("../apps/studio/lib/instagram-crypto");

test("Instagram credentials round-trip through authenticated encryption",()=>{
 const key=randomBytes(32);
 const encrypted=encryptInstagramToken("private-test-token",key);
 assert.equal(decryptInstagramToken(encrypted,key),"private-test-token");
 assert.notEqual(encrypted.ciphertext,"private-test-token");
});

test("Instagram credentials reject tampering and the wrong key",()=>{
 const key=randomBytes(32);
 const encrypted=encryptInstagramToken("private-test-token",key);
 assert.throws(()=>decryptInstagramToken({...encrypted,ciphertext:encrypted.ciphertext.slice(0,-2)+"AA"},key));
 assert.throws(()=>decryptInstagramToken(encrypted,randomBytes(32)));
});
