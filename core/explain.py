"""TEMPLATE that turns a result into a plain sentence.
No language model is involved, so a number can never be invented: every figure in the text
comes straight from core/stats_engine.py."""

ALPHA = 0.05


def fmt_p(p: float) -> str:
    return "p < 0.001" if p < 0.001 else f"p = {p:.3f}"


def explain(name: str, unit: str, r: dict, p_adj: float | None = None) -> str:
    slope = r["sen_slope_per_year"]
    lo, hi = r["ci95"]
    p = p_adj if p_adj is not None else r["hamed_rao_p"]
    direction = "increasing" if slope > 0 else "decreasing"
    text = (f"{name} is {direction} by about {abs(slope) * 10:.3g} {unit} per decade "
            f"(95% range: {lo * 10:+.3g} to {hi * 10:+.3g}) over {r['years']} years. ")
    label = "FDR-adjusted" if p_adj is not None else "autocorrelation-corrected"
    if p < ALPHA:
        text += f"This trend is statistically significant ({label} {fmt_p(p)})."
    else:
        need = r["years_to_detect"]
        text += f"No statistically significant trend was detected ({label} {fmt_p(p)}). "
        if need != float("inf"):
            text += (f"As a rough estimate, if this rate and noise level continue, a record of about {need:.0f} "
                     f"years in total would be needed to detect it (we have {r['years']}). "
                     "Not significant does not mean no change.")
    return text


def naive_vs_correct(r: dict) -> str:
    n = r["naive"]["p"] < ALPHA
    c = r["hamed_rao_p"] < ALPHA
    if n == c:
        return "The simple regression and the corrected test agree here."
    if n and not c:
        return ("A simple regression calls this trend significant, but after removing the seasonal cycle "
                "and correcting for autocorrelation it is not. Simple methods can see trends that are not there.")
    return ("A simple regression on the raw data misses this trend because the seasonal cycle hides it; "
            "after removing the seasonal cycle, the corrected tests find it. Simple methods can also miss real trends.")
