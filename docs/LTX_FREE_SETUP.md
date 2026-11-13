# LTX-2.5 free cinematic experiment

Status: documented post-V1 experiment; implementation and production enablement have not started.

## Decision

Drishvo will evaluate **LTX-2.5 Fast** as the first self-hosted cinematic scene generator. It will be optional, visual-only, disabled by default, and isolated from the stable motion-graphics renderer.

This is free software and self-hostable model access, not free compute. The code is Apache-2.0, while LTX-2/2.5 model weights use the separate LTX-2.x Community License. Current model terms permit no-cost commercial and production use below the stated annual-revenue threshold, but the licence must be reviewed again before production use or distribution of fine-tunes.

Official references:

- [LTX-2.5 model and code](https://github.com/Lightricks/LTX-2)
- [LTX Desktop and hardware guidance](https://github.com/Lightricks/LTX-Desktop)
- [LTX-2.5 model card and licence summary](https://huggingface.co/Lightricks/LTX-2.5)
- [ComfyUI documentation](https://docs.comfy.org/)

## Product boundary

- Motion graphics remain the production default and fallback.
- LTX creates short scene visuals, not the complete 60–90-second video in one request.
- ElevenLabs remains the authoritative narration and timing provider.
- LTX dialogue and music stay disabled. Optional ambience can be considered only after it is shown not to interfere with narration.
- A creator reviews and approves each generated clip before final composition or publishing.
- Failed or rejected cinematic generation never silently substitutes unrelated footage.

## Hardware gate

The current development laptop has an NVIDIA MX350 with 2 GB VRAM and is not suitable for LTX-2.5. The current Google Cloud `e2-medium` worker has no GPU and is also unsuitable.

The experiment should target at least:

- NVIDIA CUDA GPU with 16 GB VRAM for constrained/streamed testing;
- preferably 24 GB or more VRAM;
- 32–40 GB system RAM;
- fast local storage with approximately 100–160 GB free.

An RTX 3060 12 GB may run constrained FP8 workflows, but it is not the baseline for a dependable Drishvo worker. Free Colab GPUs can be used for a manual proof of concept only; their model, memory, availability, and session duration are not guaranteed.

## Planned scene contract

Each approved scene becomes an immutable request containing:

- project, storyboard version, and scene identifiers;
- model identifier `ltx-2.5-fast`;
- prompt and negative prompt;
- deterministic seed;
- portrait resolution 720 × 1280;
- 24 fps and five-second initial duration;
- visual-only audio policy;
- expected output filename and content hash;
- generation environment, model licence/version, and review state.

No notebook or community Space receives Drishvo environment files, API keys, MongoDB data, private R2 objects, user information, or unpublished account media.

## Proof-of-concept sequence

1. Prepare shot requests from one explicitly approved storyboard.
2. Generate only the first scene on a suitable free GPU session or owner-supplied GPU.
3. Download the MP4 and end the external session.
4. Validate decoding, 720 × 1280 dimensions, 24 fps, approximately five-second duration, and absence of an unexpected audio stream.
5. Review visual relevance, factual implications, flicker, malformed subjects, faces, safety, logos, text, and watermarks.
6. Approve or reject the clip explicitly.
7. Only after acceptance, implement private R2 ingestion and Remotion composition beneath the existing ElevenLabs narration and captions.

## Acceptance criteria

- No paid API or automatic fallback is invoked.
- No model weights are installed on unsupported Drishvo hosts.
- The test clip is reproducible from stored settings as far as the model permits.
- The clip introduces no textual or factual claim that bypasses storyboard approval.
- Motion graphics remain usable when the cinematic provider is disabled or unavailable.
- Licence and model provenance accompany every retained cinematic artifact.
