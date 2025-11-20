import * as auth from "/auth/auth.js";
import { supabase } from "/auth/userStore.js";

document.addEventListener("DOMContentLoaded", () => {
  loadHeader();
});

async function loadHeader() {
  console.log("load header");
  const headerPlaceholder = document.getElementById("headerPlaceholder");
  if (!headerPlaceholder) {
    console.error("body 상단에 headerPlaceholder를 추가해주세요");
    return;
  }

  try {
    const response = await fetch("/includes/_header.html");
    if (!response.ok) {
      throw new Error(`Failed to fetch header: ${response.statusText}`);
    }
    const headerHTML = await response.text();
    headerPlaceholder.innerHTML = headerHTML;

    initializeHeader();
  } catch (error) {
    console.error("Error loading header:", error);
    headerPlaceholder.innerHTML =
      '<p style="text-align:center; color:red;">헤더를 불러오는 중 오류가 발생했습니다.</p>';
  }
}

function initializeHeader() {
  console.log("initialize header");
  const translations = {
    ko: {
      nav: {
        home: "홈",
        content: "콘텐츠별 여행지",
        ai: "AI 코스 추천",
        region: "K-콘텐츠 여행 지도",
        routes: "인기 여행 루트",
        mypage: "마이페이지",
      },
      btn: { login: "로그인", signup: "회원가입" },
    },
    en: {
      nav: {
        home: "Home",
        content: "By Content",
        ai: "AI Course Picks",
        region: "By Region",
        routes: "Popular Routes",
        mypage: "My Page",
      },
      btn: { login: "Login", signup: "Sign Up" },
    },
    ja: {
      nav: {
        home: "ホーム",
        content: "コンテンツ別旅行地",
        ai: "AIコース推薦",
        region: "地域別探索",
        routes: "人気旅行ルート",
        mypage: "マイページ",
      },
      btn: { login: "ログイン", signup: "会員登録" },
    },
  };

  let currentLang = localStorage.getItem("preferredLang") || "ko";

  function updateLanguage(lang) {
    currentLang = lang;
    localStorage.setItem("preferredLang", lang);
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const keys = element.getAttribute("data-i18n").split(".");
      let value = translations[lang];
      try {
        keys.forEach((k) => {
          value = value[k];
        });
        if (value) element.innerHTML = value;
      } catch (e) {}
    });

    window.dispatchEvent(
      new CustomEvent("languagechange", { detail: { lang: currentLang } })
    );
  }

  function updateActiveNav() {
    const currentPath = window.location.pathname;
    document.querySelectorAll(".nav-link").forEach((link) => {
      const linkPath = link.getAttribute("href");
      link.classList.remove("active");
      if (linkPath === currentPath) {
        link.classList.add("active");
      }
      if (currentPath === "/" || currentPath.includes("index.html")) {
        if (link.getAttribute("href") === "/") {
          link.classList.add("active");
        }
      }
    });
  }

  function setupLogoLink() {
    // _header.html 안에서 로고 링크에 data-role="logo-home" 을 달아두면 가장 먼저 사용
    // 없으면 .logo a 를 사용
    const logoLink =
      document.querySelector("[data-role='logo-home']") ||
      document.querySelector(".logo a");

    if (!logoLink) return;

    logoLink.addEventListener("click", (e) => {
      e.preventDefault();

      const paths = window.AUTH_PATHS || {};
      const indexPath = paths.INDEX || "/";

      // 이미 메인 페이지에 있는 경우: #home 섹션으로 스무스 스크롤
      const isOnIndex =
        window.location.pathname === indexPath ||
        (indexPath === "/" &&
          (window.location.pathname === "/" ||
            window.location.pathname.includes("index.html")));

      if (isOnIndex) {
        const homeSection = document.getElementById("home");
        if (homeSection) {
          homeSection.scrollIntoView({ behavior: "smooth" });
          return;
        }
      }

      // 메인이 아니면 메인 페이지로 이동
      window.location.href = indexPath;
    });
  }

  function setupEventListeners() {
    const langSelector = document.getElementById("languageSelector");
    if (langSelector) {
      langSelector.value = currentLang;
      langSelector.addEventListener("change", (e) =>
        updateLanguage(e.target.value)
      );
    }

    document
      .getElementById("loginBtn")
      ?.addEventListener("click", auth.signInWithGoogle);
    document
      .getElementById("logoutBtn")
      ?.addEventListener("click", auth.signOut);

    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        const target = link.getAttribute("href") || "";
        if (target.startsWith("#")) {
          e.preventDefault();
          document
            .querySelector(target)
            ?.scrollIntoView({ behavior: "smooth" });
        }
      });
    });
  }

  function updateLoginUI(isLoggedIn, displayName = "") {
    const greet = document.getElementById("greeting");
    const nick = document.getElementById("nickname");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (isLoggedIn) {
      nick.textContent = displayName;
      greet.classList.remove("hide");
      logoutBtn.classList.remove("hide");
      loginBtn.classList.add("hide");
    } else {
      nick.textContent = "";
      greet.classList.add("hide");
      logoutBtn.classList.add("hide");
      loginBtn.classList.remove("hide");
    }
  }

  async function initializeAuth() {
    async function updateUser(user) {
      let displayName = "";
      if (user) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .maybeSingle();
          displayName =
            profile?.display_name || user.email?.split("@")[0] || "사용자";
        } catch (e) {
          displayName = user.email?.split("@")[0] || "사용자";
        }
      }
      updateLoginUI(!!user, displayName);
    }

    const { data } = await supabase.auth.getUser();
    await updateUser(data.user);

    supabase.auth.onAuthStateChange(async (_event, session) => {
      await updateUser(session?.user);
    });
  }

  function setupSearchModal() {
    const header = document.querySelector(".header");
    const wrap = document.getElementById("headerSearchWrap");
    const input = document.getElementById("searchInput");
    const btnToggle = document.getElementById("searchToggle");
    const btnClose = document.getElementById("searchClose");
    const btnDo = document.getElementById("searchDo");
    const results = document.getElementById("searchResults");

    const suggestTitle = document.getElementById("contentSuggestTitle");
    const suggestRail = document.getElementById("contentSuggestRail");

    let allContents = null;

    function tryTeamRenderer(items) {
      if (window.ContentCards?.render) {
        window.ContentCards.render(suggestRail, items);
        return true;
      }
      if (typeof window.renderContentCards === "function") {
        window.renderContentCards("contentSuggestRail", items);
        return true;
      }
      if (window.CardFactory?.render) {
        window.CardFactory.render(suggestRail, items);
        return true;
      }
      if (typeof window.buildCards === "function") {
        window.buildCards(suggestRail, items);
        return true;
      }
      return false;
    }
    function fallbackRender(items) {
      suggestRail.innerHTML = items
        .map(
          (it) => `
          <div class="search-item" style="min-width:220px;">
            <div style="font-weight:700;">${it.title}</div>
            <div style="color:#666;font-size:13px;margin-top:2px;">${
              it.subtitle ?? ""
            }</div>
          </div>
        `
        )
        .join("");
    }

    function renderRail(items) {
      suggestTitle.style.display = items?.length ? "" : "none";
      suggestRail.innerHTML = "";
      if (!items?.length) return;
      const ok = tryTeamRenderer(items);
      if (!ok) fallbackRender(items);
      if (wrap.style.height && wrap.style.height !== "0px") {
        wrap.style.height = "auto";
        const h = wrap.scrollHeight;
        wrap.style.height = h + "px";
      }
    }

    function clearRail() {
      suggestTitle.style.display = "none";
      suggestRail.innerHTML = "";
    }

    function setWrapHeight(open) {
      if (!wrap || !header) return;
      if (open) {
        wrap.style.height = wrap.scrollHeight + "px";
        header.classList.add("header--search-open");
      } else {
        wrap.style.height = "0px";
        header.classList.remove("header--search-open");
      }
    }
    function openSearch() {
      if (!wrap) return;
      results && (results.innerHTML = "");
      clearRail();
      if (input) input.value = "";
      setWrapHeight(true);
      setTimeout(() => input?.focus(), 0);
      ensureContentsLoaded();
    }
    function closeSearch() {
      if (!wrap) return;
      setWrapHeight(false);
    }
    function toggleSearch() {
      if (!wrap) return;
      const isOpen = wrap.style.height && wrap.style.height !== "0px";
      isOpen ? closeSearch() : openSearch();
    }
    btnToggle?.addEventListener("click", toggleSearch);
    btnClose?.addEventListener("click", closeSearch);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeSearch();
    });
    window.addEventListener("resize", () => {
      if (wrap && wrap.style.height && wrap.style.height !== "0px") {
        wrap.style.height = "auto";
        const h = wrap.scrollHeight;
        wrap.style.height = h + "px";
      }
    });

    async function ensureContentsLoaded() {
      if (allContents) return;
      try {
        const res = await fetch("/api/contents");
        if (!res.ok) throw new Error("contents load failed");
        const data = await res.json(); // [{ contents, name, ... }]
        const unique = [
          ...new Set(
            (data || []).map((d) => (d.contents || "").trim()).filter(Boolean)
          ),
        ];
        const countByContent = unique.map((c) => ({
          content: c,
          count: (data || []).filter((d) => (d.contents || "").trim() === c)
            .length,
        }));
        allContents = countByContent;
      } catch (e) {
        console.error("Failed to load contents:", e);
        allContents = [];
      }
    }
    function rankScore(q, name) {
      const a = (q || "").toLowerCase();
      const b = (name || "").toLowerCase();
      if (!a || !b) return 0;
      if (b === a) return 100;
      if (b.startsWith(a)) return 80;
      if (b.includes(a)) return 60;
      let lcs = 0;
      for (let i = 0; i < a.length; i++) {
        for (let j = i + 1; j <= a.length; j++) {
          if (b.includes(a.slice(i, j))) lcs = Math.max(lcs, j - i);
        }
      }
      return lcs;
    }
    function buildCardItems(q, boostSet = new Set()) {
      if (!allContents || allContents.length === 0) return [];
      return allContents
        .map(({ content, count }) => {
          const score =
            rankScore(q, content) +
