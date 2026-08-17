// Photoshop-style Threshold, but yellow instead of white.
//
// Every pixel becomes either pure black (#000000) or pure brand yellow
// (#FFF200) - nothing in between. Apply to a SCENE and the whole composite
// gets it: cameras, overlays, game capture, all of it.
//
// For obs-shaderfilter. Add a "Shader" filter to the scene, load this file.
//
// The cut is made on perceptual luminance, not average RGB. A pure red and a
// pure blue have wildly different brightness to the eye, and averaging them
// would put both on the same side of the threshold and flatten the image.

uniform float threshold<
    string label = "Threshold";
    string widget_type = "slider";
    float minimum = 0.0;
    float maximum = 1.0;
    float step = 0.01;
> = 0.45;

uniform float softness<
    string label = "Edge softness";
    string widget_type = "slider";
    float minimum = 0.0;
    float maximum = 0.25;
    float step = 0.005;
> = 0.0;

uniform bool invert<
    string label = "Invert";
> = false;

float4 mainImage(VertData v_in) : TARGET
{
    float4 src = image.Sample(textureSampler, v_in.uv);

    // Rec.601 luma. Green dominates because the eye is most sensitive to it.
    float luma = dot(src.rgb, float3(0.299, 0.587, 0.114));

    const float3 BLACK  = float3(0.0, 0.0, 0.0);
    const float3 YELLOW = float3(1.0, 0.949019, 0.0);   // #FFF200

    // softness 0 gives a hard binary cut - the default, and what "pure black
    // and yellow" means. Raise it only if the hard edge crawls on a noisy
    // camera feed.
    float mask = softness <= 0.0
        ? step(threshold, luma)
        : smoothstep(threshold - softness, threshold + softness, luma);

    if (invert) mask = 1.0 - mask;

    return float4(lerp(BLACK, YELLOW, mask), src.a);
}
