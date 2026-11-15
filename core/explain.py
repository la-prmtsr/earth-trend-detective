"""Sonucu sade cumleye ceviren SABLON (LLM yok, sayi uydurma riski yok).
Istege bagli: ekip bir LLM API'si kullanirsa, LLM'e SADECE bu fonksiyonun urettigi
metni ve sayilari verip 'daha sade yaz' denebilir. Sayilari LLM'e hesaplatmayin."""

ALPHA = 0.05


def fmt_p(p: float) -> str:
    return "p < 0.001" if p < 0.001 else f"p = {p:.3f}"


def explain(name: str, unit: str, r: dict, p_adj: float | None = None) -> str:
    slope = r["sen_slope_per_year"]
    lo, hi = r["ci95"]
    p = p_adj if p_adj is not None else r["hamed_rao_p"]
    direction = "increasing" if slope > 0 else "decreasing"
    text = (f"{name} is {direction} by about {slope * 10:+.3g} {unit} per decade "
            f"(95% range: {lo * 10:+.3g} to {hi * 10:+.3g}) over {r['years']} years. ")
    if p < ALPHA:
        text += f"This trend is unlikely to be chance (corrected {fmt_p(p)})."
    else:
        need = r["years_to_detect"]
        text += f"We can't be sure yet: this could still be chance (corrected {fmt_p(p)}). "
        if need != float("inf"):
            text += (f"At this rate and noise level, about {need:.0f} years of data would be needed "
                     f"to confirm it (we have {r['years']}). No evidence is not the same as no risk.")
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
            "the corrected test finds it. Simple methods can also miss real trends.")
