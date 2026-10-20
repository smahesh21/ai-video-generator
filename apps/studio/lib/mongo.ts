import {MongoClient} from "mongodb";
import {requireAccountConfig} from "./account-mode";

const globalMongo=globalThis as typeof globalThis&{drishvoMongoClient?:MongoClient};
export function mongoClient(){
 const config=requireAccountConfig();
 return globalMongo.drishvoMongoClient??(globalMongo.drishvoMongoClient=new MongoClient(config.uri));
}
export function mongoDb(){
 return mongoClient().db(requireAccountConfig().dbName);
}
