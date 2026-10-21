import {MongoClient} from "mongodb";
import {requireMongoConfig} from "./account-mode";

const globalMongo=globalThis as typeof globalThis&{drishvoMongoClient?:MongoClient};
export function mongoClient(){
 const config=requireMongoConfig();
 return globalMongo.drishvoMongoClient??(globalMongo.drishvoMongoClient=new MongoClient(config.uri));
}
export function mongoDb(){
 return mongoClient().db(requireMongoConfig().dbName);
}
