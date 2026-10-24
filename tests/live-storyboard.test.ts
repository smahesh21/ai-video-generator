import test from 'node:test';
import assert from 'node:assert/strict';
import {fixturePlan} from '../src/fixtures';
import {studioScenesFromPlan} from '../src/live-storyboard';

test('converts a validated plan into six editable studio scenes',()=>{
 const scenes=studioScenesFromPlan(fixturePlan('water','live-storyboard-test'));
 assert.equal(scenes.length,6);
 assert.deepEqual(scenes.map(scene=>scene.id),['scene-1','scene-2','scene-3','scene-4','scene-5','scene-6']);
 assert.ok(scenes.every(scene=>scene.narration.length>0&&scene.visual.length>0&&scene.seconds===12));
 assert.match(scenes[0].visual,/Show/);
 assert.deepEqual(scenes[0].visualPlan.objects,fixturePlan('water','visual-plan-check').scenes[0].objects.map(object=>({kind:object.kind,label:object.label})));
 assert.ok(scenes.every(scene=>scene.visualPlan.events.every(event=>event.objectIndex>=0)));
});
