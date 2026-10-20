import {test} from "node:test";
import {strict as assert} from "node:assert";
import {createRequire} from "node:module";
import type {Project} from "../apps/studio/lib/project-schema";
const require=createRequire(import.meta.url);
const {preservesApprovalHistory,validProjects}=require("../apps/studio/lib/project-schema") as typeof import("../apps/studio/lib/project-schema");

const scene={id:"intro",title:"Intro",narration:"How it works",visual:"Show a diagram",seconds:10};
const first={version:1,scenes:[scene],at:"2026-10-20T00:00:00Z"};
const second={version:2,scenes:[{...scene,narration:"A new explanation"}],at:"2026-10-20T01:00:00Z"};
const project:Project={id:"approval-test",topic:"Test",notes:"",audience:"Everyone",voice:"female",updated:"2026-10-20",sample:false,motif:"concept",storyboard:{version:1,scenes:[scene],approved:first}};

test("approved storyboard history is append-only across re-approvals",()=>{
 const next:Project={...project,storyboard:{version:2,scenes:second.scenes,approved:second,approvalHistory:[first]}};
 assert.equal(validProjects([next]),true);
 assert.equal(preservesApprovalHistory([project],[next]),true);
 assert.equal(preservesApprovalHistory([project],[{...next,storyboard:{...next.storyboard!,approvalHistory:[]}}]),false);
 assert.equal(preservesApprovalHistory([project],[{...project,storyboard:{...project.storyboard!,approved:{...first,scenes:[{...scene,narration:"Changed"}]}}}]),false);
 assert.equal(preservesApprovalHistory([next],[{...next,storyboard:{...next.storyboard!,approvalHistory:[{...first,at:"Changed"}]}}]),false);
});
