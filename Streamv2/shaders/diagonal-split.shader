// Diagonal split mask, with an optional accent edge.
//
// Cuts a source along a slanted line and makes one side transparent, so the
// camera underneath shows through. OBS crops are axis-aligned rectangles, so
// a diagonal has to be done in a shader.
//
// Put this on the TOP camera in the scene. The bottom camera needs to extend
// past the centre line, or the slant will expose background at the extremes.
//
// For obs-shaderfilter.

uniform float split<
    string label = "Split position";
    string widget_type = "slider";
    float minimum = 0.0;
    float maximum = 1.0;
    float step = 0.005;
> = 0.5;

uniform float slant<
    string label = "Slant";
    string widget_type = "slider";
    float minimum = -0.6;
    float maximum = 0.6;
    float step = 0.005;
> = 0.12;

uniform float feather<
    string label = "Edge feather";
    string widget_type = "slider";
    float minimum = 0.0;
    float maximum = 0.05;
    float step = 0.001;
> = 0.002;

uniform bool keep_left<
    string label = "Keep left side";
> = true;

uniform float edge_width<
    string label = "Accent edge width";
    string widget_type = "slider";
    float minimum = 0.0;
    float maximum = 0.03;
    float step = 0.001;
> = 0.004;

uniform float4 edge_color<
    string label = "Accent edge colour";
> = {1.0, 0.949019, 0.0, 1.0};      // #FFF200

float4 mainImage(VertData v_in) : TARGET
{
    float4 src = image.Sample(textureSampler, v_in.uv);

    // The dividing line, as an x position that shifts with height. uv.y runs
    // 0 at the top to 1 at the bottom, so centring on 0.5 pivots the slant
    // about the middle instead of swinging the whole line sideways.
    float line_x = split + (v_in.uv.y - 0.5) * slant;

    // Signed distance from the line: positive to the right of it.
    float d = v_in.uv.x - line_x;
    if (!keep_left) d = -d;

    // Keep the near side, drop the far side. feather 0 is a hard cut; a
    // pixel or two softens the stair-stepping a slanted edge produces.
    float keep = feather <= 0.0
        ? 1.0 - step(0.0, d)
        : 1.0 - smoothstep(-feather, feather, d);

    float4 outc = float4(src.rgb, src.a * keep);

    // Accent stripe sitting on the seam. Drawn last so it is unaffected by
    // the cut that just happened.
    if (edge_width > 0.0)
    {
        float on_edge = 1.0 - smoothstep(edge_width * 0.5, edge_width, abs(d));
        outc.rgb = lerp(outc.rgb, edge_color.rgb, on_edge * edge_color.a);
        outc.a = max(outc.a, on_edge * edge_color.a);
    }

    return outc;
}
