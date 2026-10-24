"""The Beidwerk design language for agents: the principles, the tokens, the kit, the four signs, and image prompts
in the Beidwerk style. Read-only and offline: everything comes from data.json next to this file, which
beidwerk-studio writes for each release.

    claude mcp add beidwerk -- uvx --from git+https://github.com/maximedogawa/beidwerk-web beidwerk-mcp
"""
import json
from functools import cache
from pathlib import Path

from mcp.server.mcpserver import MCPServer

INSTRUCTIONS = """Beidwerk is an art and software studio from Vienna with its own design language. Use these tools to
build in the Beidwerk style: read design_principles first, take colours and type from design_tokens, build pages with
the kit's bw- classes, use the four signs for marks, and write image prompts with build_prompt. The code and the look
are open; the songs, pictures and texts of Beidwerk are not."""

mcp = MCPServer(name="beidwerk", title="Beidwerk", instructions=INSTRUCTIONS, version="0.1.4")


@cache
def data() -> dict:
    return json.loads((Path(__file__).with_name("data.json")).read_text(encoding="utf-8"))


@mcp.tool()
def design_principles(lang: str = "en") -> str:
    """The seven principles of the Beidwerk design language, the test for anything new, and what it never does.
    lang: "en" or "de"."""
    p = data()["principles"]["de" if lang == "de" else "en"]
    lines = [f"{i}. {x['title']}. {x['text']}" for i, x in enumerate(p["principles"], 1)]
    return "\n".join(lines + ["", p["test"], "", "Never:"] + [f"- {n}" for n in p["never"]])


@mcp.tool()
def design_tokens(mode: str = "light") -> dict:
    """The design tokens: colours (hex) for one mode, type families and sizes, spacing, radius, lines.
    mode: "light" (the receipt: paper, ink) or "dark" (the stage)."""
    t = data()["tokens"]
    m = mode if mode in t["modes"] else "light"
    return {"mode": m, "color": {name: v[m] for name, v in t["color"].items()},
            "type": t["type"], "space": t["space"], "radius": t["radius"], "line": t["line"]}


@mcp.tool()
def kit(component: str = "") -> dict:
    """The kit: the three stylesheets to link, the body class, and the bw- components with an HTML example each.
    component: one class (e.g. "bw-button"), or empty for all."""
    k = data()["kit"]
    if component:
        hit = [c for c in k["components"] if c["class"] == component.strip().lstrip(".")]
        return {"component": hit[0]} if hit else {"error": f"no component {component!r}",
                                                  "components": [c["class"] for c in k["components"]]}
    return k


@mcp.tool()
def signs(lang: str = "en") -> list[dict]:
    """The four red signs: one per band member, together the letter B. Each with its member, instrument, decade,
    what it is in the B, and its SVG. lang: "en" or "de"."""
    lg = "de" if lang == "de" else "en"
    return [{"sign": s["sign"][lg], "member": s["member"], "role": s["role"], "decade": s["decade"],
             "in_the_b": s["meaning"][lg], "svg": s["svg"]} for s in data()["signs"]]


@mcp.tool()
def build_prompt(subject: str, mode: str = "receipt", accent: str = "") -> str:
    """An image prompt in the Beidwerk style: the subject, then the fixed style text.
    subject: what is in the picture, naming the one red object (e.g. "two hands passing a key over a counter, a small
    red enamel tag on the key"). mode: "receipt" (light, daylight, paper) or "stage" (night, smoke, warm light).
    accent: the one red object, if not "one small cinnabar-red object". No text is ever written into the picture."""
    st = data()["prompt_styles"]
    style = st["stage" if mode == "stage" else "receipt"].replace("{accent_object}", accent.strip() or st["accent_default"])
    return f"{subject.strip().rstrip('.')}. Style: {style}"


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
