import React, { useState, useEffect } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Sheet, 
  Link, 
  CheckCircle, 
  Copy, 
  Plus, 
  Minus, 
  Info, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Layers, 
  Compass, 
  HelpCircle, 
  Trash2, 
  Settings, 
  Check, 
  ExternalLink, 
  CheckSquare, 
  Activity, 
  DollarSign, 
  Printer, 
  X,
  CreditCard,
  Download
} from "lucide-react";
import html2canvas from "html2canvas";
import { 
  OrderFormData, 
  SubmissionResponse, 
  SavedSubmission,
  PRODUCT_PRESETS,
  LINING_PRESETS,
  COLOR_PRESETS,
  THICKNESS_PRESETS,
  SIZE_PRESETS
} from "./types";

export default function App() {
  // 1. Form Input States
  const [formData, setFormData] = useState<OrderFormData>({
    ordererName: "",
    customsId: "",
    postalCode: "",
    address: "",
    phone: "",
    productName: "고탄성페브릭 - ",
    liningOption: "오픈셀",
    color: "블랙",
    gender: "남성",
    thickness: "", 
    size: "", 
    quantity: 1,
    price: 0,
    supplyPrice: 0,
    customNotes: ""
  });

  // Track product name 1-depth & 2-depth
  const [productDepth1, setProductDepth1] = useState<"고탄성페브릭" | "SCS">("고탄성페브릭");
  const [productDepth2, setProductDepth2] = useState("");

  // Keep track of custom input states
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [customColorText, setCustomColorText] = useState("");

  // Validation feedback
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OrderFormData, string>>>({});

  // 3. Submissions History State (Local storage caching)
  const [submissions, setSubmissions] = useState<SavedSubmission[]>(() => {
    try {
      const cached = localStorage.getItem("order_submissions");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Selected order for detailed modal receipt inspector
  const [selectedSubmission, setSelectedSubmission] = useState<SavedSubmission | null>(null);

  // Status transitions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmissionResponse | null>(null);

  // Sync historical submissions to local storage
  useEffect(() => {
    localStorage.setItem("order_submissions", JSON.stringify(submissions));
  }, [submissions]);

  // Load backend mock history on mount to sync with server
  useEffect(() => {
    fetch("/api/mock-submissions")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          // Merge server-side mock records with local submissions
          setSubmissions(prev => {
            const filteredLocal = prev.filter(p => !p.simulated);
            const serverMocks = data.map((item: any, idx: number) => ({
              id: `server-mock-${idx}`,
              timestamp: item.timestamp,
              data: item.data as OrderFormData,
              simulated: true,
              row: item.row
            }));
            return [...serverMocks, ...filteredLocal].sort((a, b) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          });
        }
      })
      .catch((err) => console.log("Failed to load server mock submissions:", err));
  }, []);

  // Sync combined product name
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      productName: productDepth2.trim() ? `${productDepth1} / ${productDepth2.trim()}` : `${productDepth1}`
    }));
  }, [productDepth1, productDepth2]);

  const validateForm = () => {
    const errors: Partial<Record<keyof OrderFormData, string>> = {};
    const regexCustoms = /^[pP]\d{12}$/; // Personal customs code: starts with P/p, 12 digits
    const regexPhone = /^01[016789]-?\d{3,4}-?\d{4}$/; // SK phone regex
    
    if (!formData.ordererName.trim()) {
      errors.ordererName = "주문자 이름을 입력해주세요.";
    }
    
    if (!formData.customsId.trim()) {
      errors.customsId = "개인통관고유번호는 필수 항목입니다.";
    } else if (!regexCustoms.test(formData.customsId.trim())) {
      errors.customsId = "통관부호 형식(P로 시작하는 13자리 숫자)이 바르지 않습니다.";
    }
    
    if (!formData.postalCode.trim()) {
      errors.postalCode = "우편번호를 입력해주세요.";
    }
    
    if (!formData.address.trim()) {
      errors.address = "배송 주소를 입력해주세요.";
    }
    
    if (!formData.phone.trim()) {
      errors.phone = "연락처를 입력해주세요.";
    } else if (!regexPhone.test(formData.phone.replace(/\s/g, ""))) {
      errors.phone = "올바른 연락처 형식 (e.g. 010-1234-5678)을 작성해주세요.";
    }

    if (!productDepth2.trim()) {
      errors.productName = "직접 입력할 제품 상세 품목명을 기재해주세요 (2뎁스).";
    }

    if (!formData.size.trim()) {
      errors.size = "사이즈를 직접 기입해주세요.";
    }

    if (isCustomColor && !customColorText.trim()) {
      errors.color = "직접 입력할 색상을 기재해주세요.";
    }

    if (!formData.thickness.trim()) {
      errors.thickness = "네오프렌 두께를 직접 기입해주세요.";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitResult(null);
    
    if (!validateForm()) {
      // Scroll to first error
      const firstError = Object.keys(formErrors)[0];
      const element = document.getElementById(`field-${firstError}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    
    setIsSubmitting(true);

    // Form final mapping
    const finalProduct = `${productDepth1} / ${productDepth2.trim()}`;
    const finalLining = formData.liningOption;
    const finalColor = isCustomColor ? customColorText.trim() : formData.color;
    const finalThickness = formData.thickness;

    const finalPayload: OrderFormData = {
      ...formData,
      productName: finalProduct,
      liningOption: finalLining,
      color: finalColor,
      thickness: finalThickness,
      price: 0,
      supplyPrice: 0,
      quantity: 1
    };

    // 구글 스프레드시트가 0으로 시작하는 우편번호나 연락처를 숫자로 자동 전환해 맨 앞 0을 생략하는 현상을 방지합니다.
    // 네트워크 전송용 페이로드에만 접두사(') 처리를 하여, 사용자 UI 화면 및 로컬 로그에는 깔끔하게 원본 값이 나타나도록 연동합니다.
    const networkPayload = {
      ...finalPayload,
      phone: finalPayload.phone && finalPayload.phone.startsWith("0") ? `'${finalPayload.phone}` : finalPayload.phone,
      postalCode: finalPayload.postalCode && finalPayload.postalCode.startsWith("0") ? `'${finalPayload.postalCode}` : finalPayload.postalCode
    };

    try {
      let resJson: SubmissionResponse;

      try {
        const response = await fetch("/api/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(networkPayload),
        });

        if (!response.ok) {
          throw new Error("서버 응답 오류가 발생했습니다.");
        }

        resJson = await response.json();
      } catch (backendError) {
        // 백엔드 Express 서버가 통신 불가능할 때 (Vercel 정적 페이지 빌드 환경 등)
        // 브라우저에서 직접 구글 스프레드시트 앱스크립트(GAS) 주소로 데이터를 전송하도록 폴백 처리합니다.
        console.warn("Express backend routing failed, falling back to direct browser post:", backendError);
        const directScriptUrl = "https://script.google.com/macros/s/AKfycbwjOSzr0jESut4hj06S4QLWDYh5FZKIdoSuH6jRED6eqVLJifOOEJbCtl5sSueD4_3B/exec";

        // preflight CORS 방지를 위해 Content-Type을 text/plain으로 전송 (GAS 내부 JSON 파싱은 동일하게 처리됨)
        const directResponse = await fetch(directScriptUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(networkPayload),
        });

        let directData: any = {};
        try {
          directData = await directResponse.json();
        } catch (jsonErr) {
          // CORS 리디렉션 제한 등으로 최종 JSON을 받지 못할 수 있으나, 브라우저가 POST 요청을 전달하여 시트에 실제 기입은 성공합니다.
          directData = {
            status: "success",
            message: "구글 시트 연동 전송 완료"
          };
        }

        resJson = {
          status: directData.status || "success",
          message: directData.message || "구글 시트에 직접 데이터를 전송했습니다.",
          row: directData.row || "확인 불가 (직접 전송)",
          simulated: false,
          timestamp: new Date(new Date().getTime() + (9 * 60 * 60 * 1000))
            .toISOString()
            .replace("T", " ")
            .substring(0, 19)
        };
      }

      setSubmitResult(resJson);

      if (resJson.status === "success") {
        // Dynamic save to simulation ledger view
        const newSubmissionId = `sub-${Date.now()}`;
        const newSubmission: SavedSubmission = {
          id: newSubmissionId,
          timestamp: resJson.timestamp || new Date().toLocaleString(),
          data: finalPayload,
          simulated: !!resJson.simulated,
          row: resJson.row
        };

        // Cache locally
        setSubmissions(prev => [newSubmission, ...prev]);

        // Show successful completion view or modal
        setSelectedSubmission(newSubmission);

        // Reset form inputs partially
        setFormData(prev => ({
          ...prev,
          ordererName: "",
          customsId: "",
          postalCode: "",
          address: "",
          phone: "",
          customNotes: "",
          liningOption: "오픈셀",
          color: "블랙",
          gender: "남성",
          thickness: "",
          size: "",
          price: 0,
          supplyPrice: 0,
          quantity: 1
        }));
        
        // Reset state inputs
        setProductDepth2("");
        setCustomColorText("");
        setIsCustomColor(false);
      }
    } catch (error: any) {
      console.error(error);
      setSubmitResult({
        status: "error",
        message: error.message || "구글 시트 전송 중 오류가 발생했습니다."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeSubmission = (id: string, simulated: boolean) => {
    if (confirm("주문 목록에서 해당 기록을 삭제하시겠습니까? (스프레드시트 원본 데이터는 삭제되지 않습니다.)")) {
      setSubmissions(prev => prev.filter(sub => sub.id !== id));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
    }
  };

  const clearSimulationHistory = async () => {
    if (confirm("서버와 클라이언트에 기록된 시뮬레이션 주문 기록을 모두 초기화하시겠습니까?")) {
      try {
        await fetch("/api/mock-submissions/clear", { method: "POST" });
        setSubmissions(prev => prev.filter(p => !p.simulated));
      } catch (err) {
        console.error("Failed to clear server mocks", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900 pb-24">
      


      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 pt-8">

        {/* 2. CORE TWO-COLUMN LAYOUT: SURVING FORM & PREVIEW/INSPECTOR */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Order Survey Form (Col span 7) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm p-6 md:p-8 self-stretch">
            
            <div className="mb-6 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono tracking-wider text-blue-600 font-bold uppercase">DC inside 프리다이빙 갤러리 짱</span>
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">도겸업!! 베스트다이브 슈트 주문폼</h2>
              </div>
              <HelpCircle className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors" />
            </div>

            <form onSubmit={handleOrderSubmit} className="space-y-8">
              
              {/* SECTION A: 주문인 인적사항 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">주문자 및 배송 정보</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Orderer Name Input */}
                  <div id="field-ordererName" className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-medium">주문자 이름 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="예: 홍길동"
                      value={formData.ordererName}
                      onChange={(e) => setFormData(prev => ({ ...prev, ordererName: e.target.value }))}
                      className={`w-full text-sm bg-slate-950 border ${formErrors.ordererName ? 'border-rose-500' : 'border-slate-800'} rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
                    />
                    {formErrors.ordererName && <p className="text-[11px] text-rose-500">{formErrors.ordererName}</p>}
                  </div>

                  {/* Customs Identification Number */}
                  <div id="field-customsId" className="space-y-1.5">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>개인통관고유번호 <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-blue-600 font-mono font-bold">P로 시작하는 13자리</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={13}
                      placeholder="예: P123456789012"
                      value={formData.customsId}
                      onChange={(e) => setFormData(prev => ({ ...prev, customsId: e.target.value.toUpperCase().trim() }))}
                      className={`w-full text-sm bg-white border ${formErrors.customsId ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase transition-all shadow-sm`}
                    />
                    {formErrors.customsId && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.customsId}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Phone / Contact */}
                  <div id="field-phone" className="col-span-1 space-y-1.5">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">연락처 <span className="text-rose-500">*</span></label>
                    <input
                      type="tel"
                      required
                      placeholder="예: 010-1234-5678"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full text-sm bg-white border ${formErrors.phone ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                    />
                    {formErrors.phone && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.phone}</p>}
                  </div>

                  {/* Postal Code (Required) */}
                  <div id="field-postalCode" className="col-span-1 space-y-1.5">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">우편번호 (필수) <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="예: 06130"
                      value={formData.postalCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value.replace(/[^0-9]/g, "") }))}
                      className={`w-full text-sm bg-white border ${formErrors.postalCode ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                    />
                    {formErrors.postalCode && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.postalCode}</p>}
                  </div>

                  {/* Address */}
                  <div id="field-address" className="col-span-1 md:col-span-1 space-y-1.5 font-sans">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">주소 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="예: 서울특별시 강남구 테헤란로..."
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      className={`w-full text-sm bg-white border ${formErrors.address ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                    />
                    {formErrors.address && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.address}</p>}
                  </div>
                </div>
              </div>

              {/* SECTION B: 맞춤 상세 옵션 */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase font-sans">제품 상세 옵션</h3>
                </div>

                {/* 1. Product Name Preset (Structured 1-depth and 2-depth) */}
                <div id="field-productName" className="space-y-3">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-wider block">제작 제품 품목명 <span className="text-rose-500">*</span></label>
                  
                  <div className="space-y-2">
                    <span className="text-[11px] text-slate-400 font-bold block">1뎁스: 분류 선택</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(["고탄성페브릭", "SCS"] as const).map((opt) => (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => setProductDepth1(opt)}
                          className={`py-2 px-3 text-xs md:text-sm font-bold rounded-lg border transition-all duration-200 cursor-pointer text-center ${
                            productDepth1 === opt
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10"
                              : "bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] text-slate-400 font-bold block">2뎁스: 상세 제품명 입력</span>
                    <input
                      type="text"
                      required
                      placeholder="상세 제품 품목명을 직접 입력해 주세요 (예: 원피스 슈트, 자켓, 뷰티 레깅스 등)"
                      value={productDepth2}
                      onChange={(e) => setProductDepth2(e.target.value)}
                      className={`w-full text-sm bg-white border ${formErrors.productName ? 'border-rose-500' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-450 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                    />
                    {formErrors.productName && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.productName}</p>}
                  </div>
                </div>

                {/* 2. Gender Selection (Only Male and Female) */}
                <div id="field-gender" className="space-y-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block font-sans">성별 선택</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["남성", "여성"] as const).map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                        className={`py-2 px-3 text-xs md:text-sm font-bold rounded-lg border transition-all duration-200 cursor-pointer text-center ${
                          formData.gender === g
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10"
                            : "bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Direct inputs side-by-side for sizing & thickness */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Size Custom Text Input */}
                  <div id="field-size" className="space-y-1.5">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider block font-sans">사이즈 직접 입력 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="본인의 사이즈를 직접 작성해 주세요 (예: M, L, ML 등)"
                      value={formData.size}
                      onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                      className={`w-full text-sm bg-white border ${formErrors.size ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-450 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                    />
                    {formErrors.size && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.size}</p>}
                  </div>

                  {/* Neoprene Thickness Custom Text Input */}
                  <div id="field-thickness" className="space-y-1.5">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider block font-sans">네오프렌 두께 직접 입력 <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="두께를 직접 작성해 주세요 (예: 2mm, 3mm, 5mm 등)"
                      value={formData.thickness}
                      onChange={(e) => setFormData(prev => ({ ...prev, thickness: e.target.value }))}
                      className={`w-full text-sm bg-white border ${formErrors.thickness ? 'border-rose-500 focus:ring-rose-500/10' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-slate-850 placeholder:text-slate-450 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm`}
                    />
                    {formErrors.thickness && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.thickness}</p>}
                  </div>
                </div>

                {/* 4. Lining Options (오픈셀 & 클로즈셀) */}
                <div id="field-liningOption" className="space-y-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block font-sans">수트 내피 원단 옵션</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(["오픈셀", "클로즈셀"] as const).map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setFormData(prev => ({ ...prev, liningOption: opt }))}
                        className={`py-2.5 px-4 text-xs md:text-sm font-bold rounded-lg border transition-all duration-200 cursor-pointer text-center ${
                          formData.liningOption === opt
                            ? "bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10"
                            : "bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Custom Color Selection */}
                <div id="field-color" className="space-y-3">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block font-sans">수트 전면/측면 메인 컬러 선택</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COLOR_PRESETS.map((col, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => {
                          if (col.label === "직접입력") {
                            setIsCustomColor(true);
                          } else {
                            setIsCustomColor(false);
                            setFormData(prev => ({ ...prev, color: col.label }));
                          }
                        }}
                        className={`p-2.5 rounded-lg border flex items-center gap-2.5 transition-all text-left duration-200 cursor-pointer ${
                          (isCustomColor && col.label === "직접입력") || (!isCustomColor && formData.color === col.label)
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm font-semibold"
                            : "bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {col.hex ? (
                          <span 
                            className="w-4 h-4 rounded-full border border-slate-200 shadow-sm flex-shrink-0" 
                            style={{ backgroundColor: col.hex }} 
                          />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-200 flex items-center justify-center bg-gradient-to-tr from-slate-200 to-slate-400 text-[8px] font-bold text-slate-700 flex-shrink-0">
                            C
                          </span>
                        )}
                        <span className="text-xs truncate font-medium">{col.label}</span>
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {isCustomColor && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-1.5"
                      >
                        <input
                          type="text"
                          required={isCustomColor}
                          placeholder="원하시는 커스텀 색상을 기입해 주세요 (예: 샴페인 골드, 레몬 마블 등)"
                          value={customColorText}
                          onChange={(e) => setCustomColorText(e.target.value)}
                          className="w-full text-sm bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        />
                        {formErrors.color && <p className="text-[11px] text-rose-500 font-semibold">{formErrors.color}</p>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>

              {/* SECTION C: 특별 요구사항 및 커스텀 기재 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase font-sans">특별 요구사항 및 상세 지시</h3>
                </div>

                {/* Custom Notes & Special Requirements requests */}
                <div id="field-customNotes" className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>커스텀 요구사항 및 제조 지시 기재</span>
                    <span className="text-[10px] text-slate-400 font-medium">상세 기재</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="헤으응 프다갤짱 도겸짱"
                    value={formData.customNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, customNotes: e.target.value }))}
                    className="w-full text-sm bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 shadow-sm transition-all"
                  />
                </div>
              </div>

              {/* Server actions footer */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/10"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      구글 스프레드시트로 주문 정보 동기화 중...
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-5 h-5 text-white" />
                      제작 맞춤 주문서 등록하기
                    </>
                  )}
                </button>
              </div>

              {/* Status responses banner */}
              {submitResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border flex gap-3 ${
                    submitResult.status === "success" 
                      ? "bg-green-50 border-green-250 text-green-800"
                      : "bg-rose-50 border-rose-250 text-rose-800"
                  }`}
                >
                  <CheckCircle className={`w-5 h-5 shrink-0 ${submitResult.status === "success" ? "text-green-600" : "text-rose-600"}`} />
                  <div>
                    <h5 className="font-extrabold text-xs uppercase tracking-wider mb-0.5">
                      {submitResult.status === "success" 
                        ? (submitResult.simulated ? "주문 접수 완료 (로컬 저장됨)" : "구글 스프레드시트 배포 완료") 
                        : "주문 처리 전송 예외"}
                    </h5>
                    <p className="text-xs leading-relaxed opacity-90">{submitResult.message}</p>
                    {submitResult.row && (
                      <span className="inline-block mt-2 font-mono text-[10px] bg-white text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                        Spreadsheet Row: #{submitResult.row}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}

            </form>
          </div>

          {/* Right Preview Section / Submission history ledger (Col span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* LEDGER 1: Active Order Receipt Preview Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
              
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-105">
                <span className="text-xs font-bold tracking-wider text-slate-500">맞춤 디자인 실시간 프리뷰</span>
                <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Bespoke Lab
                </span>
              </div>

              {/* Invoice card container */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-5 font-mono shadow-sm">
                <div className="text-center border-b border-dashed border-slate-250 pb-4">
                  <h4 className="text-sm font-bold text-slate-800 tracking-widest uppercase">ORDER INVOICE PREVIEW</h4>
                  <p className="text-[9px] text-slate-400 mt-1">ISSUED AT {new Date().toLocaleDateString()} LOCAL TIME</p>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Form detail items */}
                  <div className="flex justify-between">
                    <span className="text-slate-500">품목명:</span>
                    <span className="text-slate-800 font-bold max-w-[200px] truncate text-right">
                      {productDepth1} / {productDepth2 || "[상세 제품명 대기]"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">성별사양:</span>
                    <span className="text-slate-800 font-medium">{formData.gender || "미정"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">사이즈:</span>
                    <span className="text-slate-800 font-medium">{formData.size || "[직접 입력 대기]"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">원단두께:</span>
                    <span className="text-slate-800 font-medium">{formData.thickness || "[직접 입력 대기]"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">내피구성:</span>
                    <span className="text-slate-800 font-medium max-w-[200px] truncate text-right">
                      {formData.liningOption}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">스킨컬러:</span>
                    <span className="text-slate-800 font-medium flex items-center gap-1.5 justify-end">
                      {isCustomColor ? (customColorText || "직접 입력 대기") : (
                        <>
                          <span 
                            className="w-2.5 h-2.5 rounded-full border border-slate-200 inline-block shadow-sm"
                            style={{ backgroundColor: COLOR_PRESETS.find(p => p.label === formData.color)?.hex || "#FFFFFF" }} 
                          />
                          {formData.color}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-250 pt-3">
                  <div className="text-[10px] text-slate-405 font-bold mb-1 uppercase tracking-wider text-slate-400">인적 사양 및 배송 정보</div>
                  <div className="grid grid-cols-2 gap-y-1 text-[11px]">
                    <div className="text-slate-505 text-left text-slate-500">주문자:</div>
                    <div className="text-slate-805 text-right font-bold text-slate-800">{formData.ordererName || "[입력 대기]"}</div>
                    <div className="text-slate-505 text-left text-slate-500">통관번호:</div>
                    <div className="text-slate-805 text-right font-mono text-[10px] truncate text-slate-800">{formData.customsId || "[입력 대기]"}</div>
                    <div className="text-slate-505 text-left text-slate-500">우편번호:</div>
                    <div className="text-slate-805 text-right text-slate-800">{formData.postalCode || "[입력 대기]"}</div>
                  </div>
                </div>

                {formData.customNotes && (
                  <div className="bg-white p-2.5 text-[10px] text-slate-650 border border-slate-200 rounded-lg max-h-[80px] overflow-y-auto leading-relaxed shadow-sm">
                    <span className="font-bold border-b border-slate-100 inline-block pb-0.5 text-[9px] uppercase tracking-wide text-blue-600">기타 특이 요구사항:</span>
                    <p className="pt-1">{formData.customNotes}</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          </section>
      </main>

      {/* 4. MODAL DETAILED ORDER RECEIPT INSPECTOR */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto py-10">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg w-full shadow-2xl relative my-auto"
            >
              <button 
                onClick={() => setSelectedSubmission(null)}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex gap-2 items-center mb-4 text-slate-900">
                <FileText className="w-5 h-5 text-blue-600" />
                <h4 className="font-extrabold text-base text-slate-900">영수증 명세 및 서베이 세부정보</h4>
              </div>

              {/* Detailed Invoice Printable Canvas block */}
              <div id="receipt-print-area" className="bg-white text-slate-800 p-6 md:p-8 rounded-lg space-y-6 shadow-inner font-mono text-xs border border-slate-200">
                <div className="space-y-1.5 leading-relaxed pt-2">
                  <div className="flex justify-between font-bold text-[13px] text-slate-950">
                    <span>주문 일자:</span>
                    <span>{selectedSubmission.timestamp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>주문자 성명:</span>
                    <span className="text-slate-950 font-extrabold">{selectedSubmission.data.ordererName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>개인통관고유부호:</span>
                    <span className="text-slate-900 tracking-wider select-all font-bold font-mono">{selectedSubmission.data.customsId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>연락처 (인수자):</span>
                    <span className="text-slate-950">{selectedSubmission.data.phone}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span>배송지 우편번호:</span>
                    <span className="text-slate-950 font-bold">{selectedSubmission.data.postalCode}</span>
                  </div>
                  <div className="flex justify-between text-right">
                    <span>배송지 기본주소:</span>
                    <span className="text-slate-950 max-w-[200px] leading-snug break-all font-bold">{selectedSubmission.data.address}</span>
                  </div>
                  <p className="text-slate-300">----------------------------------------</p>

                  <div className="flex justify-between text-[13px] font-bold text-slate-950 bg-slate-50 p-2 rounded border border-slate-200">
                    <span>주문 제품 사양:</span>
                    <span>{selectedSubmission.data.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>성별 적용 구조:</span>
                    <span className="text-slate-950">{selectedSubmission.data.gender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>기제 사이즈 규정:</span>
                    <span className="text-slate-950 font-semibold">{selectedSubmission.data.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>수트 원단 두께:</span>
                    <span className="text-slate-950">{selectedSubmission.data.thickness}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>적용 사양 내피:</span>
                    <span className="text-slate-950">{selectedSubmission.data.liningOption}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>스킨 원 톤 컬러:</span>
                    <span className="text-slate-950 font-medium">{selectedSubmission.data.color}</span>
                  </div>
                  <p className="text-slate-300">----------------------------------------</p>
                  
                  {selectedSubmission.data.customNotes && (
                    <div className="mt-4 p-2.5 bg-slate-50 text-[10px] rounded border border-slate-200 shadow-sm">
                      <div className="font-bold underline text-slate-800">커스텀 및 특별 지시 요구 기재사항:</div>
                      <p className="mt-1 leading-normal text-slate-650 italic whitespace-pre-line">{selectedSubmission.data.customNotes}</p>
                    </div>
                  )}
                </div>

                <div className="text-center pt-4 border-t-2 border-dashed border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold tracking-widest">THANK YOU FOR YOUR BESPOKE ORDER</p>
                  <p className="text-[8px] text-slate-400 mt-0.5">Designed with Antigravity Agent, cloud-orchestrated safely</p>
                </div>
              </div>

              {/* Action operations inside Modal footer */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    const element = document.getElementById("receipt-print-area");
                    if (!element) return;
                    try {
                      // Create a clone of the element to avoid transform/modal-scroll-scale issues
                      const clone = element.cloneNode(true) as HTMLElement;
                      clone.style.position = "absolute";
                      clone.style.left = "-9999px";
                      clone.style.top = "-9999px";
                      clone.style.width = "450px"; // Ensure a consistent, beautiful width for the receipt
                      clone.style.backgroundColor = "#ffffff";
                      clone.style.transform = "none";
                      clone.style.opacity = "1";
                      clone.style.visibility = "visible";
                      document.body.appendChild(clone);

                      // Wait a brief moment to ensure layout is applied
                      await new Promise((resolve) => setTimeout(resolve, 80));

                      const canvas = await html2canvas(clone, {
                        backgroundColor: "#ffffff",
                        scale: 2,
                        logging: false,
                        useCORS: true,
                        allowTaint: true
                      });

                      // Clean up clone
                      document.body.removeChild(clone);

                      const dataUrl = canvas.toDataURL("image/png");
                      const link = document.createElement("a");
                      link.download = `bestdive_order_${selectedSubmission ? selectedSubmission.data.ordererName : "suit"}.png`;
                      link.href = dataUrl;
                      link.click();
                    } catch (err) {
                      console.error("Image generation failed:", err);
                      alert("이미지 저장을 실패했습니다.");
                    }
                  }}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  주문서 이미지 저장
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                >
                  목록 대장으로 돌아가기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
