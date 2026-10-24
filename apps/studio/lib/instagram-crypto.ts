import {createCipheriv,createDecipheriv,randomBytes} from "node:crypto";

export type EncryptedSecret={version:1;iv:string;tag:string;ciphertext:string};

export function encryptInstagramToken(token:string,key:Buffer):EncryptedSecret{
 if(key.length!==32)throw Error("Instagram encryption key must be 32 bytes.");
 const iv=randomBytes(12);
 const cipher=createCipheriv("aes-256-gcm",key,iv);
 const ciphertext=Buffer.concat([cipher.update(token,"utf8"),cipher.final()]);
 return {version:1,iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),ciphertext:ciphertext.toString("base64")};
}

export function decryptInstagramToken(secret:EncryptedSecret,key:Buffer){
 if(key.length!==32||secret.version!==1)throw Error("Unsupported Instagram credential.");
 const decipher=createDecipheriv("aes-256-gcm",key,Buffer.from(secret.iv,"base64"));
 decipher.setAuthTag(Buffer.from(secret.tag,"base64"));
 return Buffer.concat([decipher.update(Buffer.from(secret.ciphertext,"base64")),decipher.final()]).toString("utf8");
}
