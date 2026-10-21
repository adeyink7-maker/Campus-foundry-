import { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Store, 
  MapPin, 
  Phone, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ShoppingBag,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { StudentBusiness, StudentServiceItem } from '../types';
import { CATEGORIES, CAMPUS_ZONES, ALL_UNILORIN_HOSTELS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { HostelSelectMenu } from './HostelSelectMenu';
import { FacultyDepartmentSelector } from './FacultyDepartmentSelector';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBusinessCreated: (business: StudentBusiness) => void;
  onRequireAuth?: () => void;
}

const DRAFT_STORAGE_KEY = 'campus_foundry_listing_draft_v2';

export const CreateBusinessModal = ({
  isOpen,
  onClose,
  onBusinessCreated,
  onRequireAuth,
}: CreateBusinessModalProps) => {
  const { currentUser, updateUser } = useAuth();

  // Load draft if available
  const [hasDraft, setHasDraft] = useState(false);

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Food & Pastries');
  const [campus, setCampus] = useState<'Permanent Site' | 'Tanke Off-Campus' | 'Mini Campus' | 'Sub-Hostels'>('Permanent Site');
  const [selectedHostel, setSelectedHostel] = useState(() => {
    return ALL_UNILORIN_HOSTELS.find((h) => currentUser?.hostelLocation?.includes(h)) || 'Lagos Hostel (Male)';
  });
  const [roomNumber, setRoomNumber] = useState('');
  const [ownerName, setOwnerName] = useState(currentUser?.fullName || '');
  const [studentFaculty, setStudentFaculty] = useState('Faculty of Communication and Information Sciences (CIS)');
  const [studentDept, setStudentDept] = useState('Computer Science');
  const [studentLevel, setStudentLevel] = useState('300 Level');
  const [whatsapp, setWhatsapp] = useState(currentUser?.whatsapp || '08012345678');
  const [acceptsHostelDelivery, setAcceptsHostelDelivery] = useState(true);
  const [deliveryTimeEstimate, setDeliveryTimeEstimate] = useState('15 - 30 mins');
  const [imageUrl, setImageUrl] = useState('');

  // Initial services / products
  const [services, setServices] = useState<Array<{ name: string; price: string; description: string }>>([
    { name: 'Standard Item / Service', price: '1500', description: 'Freshly prepared or delivered on demand.' },
  ]);

  // Load draft on mount / open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.name) setName(draft.name);
        if (draft.tagline) setTagline(draft.tagline);
        if (draft.description) setDescription(draft.description);
        if (draft.category) setCategory(draft.category);
        if (draft.campus) setCampus(draft.campus);
        if (draft.selectedHostel) setSelectedHostel(draft.selectedHostel);
        if (draft.roomNumber) setRoomNumber(draft.roomNumber);
        if (draft.ownerName) setOwnerName(draft.ownerName);
        if (draft.studentFaculty) setStudentFaculty(draft.studentFaculty);
        if (draft.studentDept) setStudentDept(draft.studentDept);
        if (draft.studentLevel) setStudentLevel(draft.studentLevel);
        if (draft.whatsapp) setWhatsapp(draft.whatsapp);
        if (draft.deliveryTimeEstimate) setDeliveryTimeEstimate(draft.deliveryTimeEstimate);
        if (draft.imageUrl) setImageUrl(draft.imageUrl);
        if (Array.isArray(draft.services) && draft.services.length > 0) setServices(draft.services);
        setHasDraft(true);
      }
    } catch (e) {
      console.error('Failed reading draft:', e);
    }
  }, [isOpen]);

  // Auto-save draft changes to localStorage
  useEffect(() => {
    if (!isOpen) return;
    try {
      const draftData = {
        name,
        tagline,
        description,
        category,
        campus,
        selectedHostel,
        roomNumber,
        ownerName,
        studentFaculty,
        studentDept,
        studentLevel,
        whatsapp,
        acceptsHostelDelivery,
        deliveryTimeEstimate,
        imageUrl,
        services,
      };
      if (name.trim() || description.trim()) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      }
    } catch {}
  }, [
    name,
    tagline,
    description,
    category,
    campus,
    selectedHostel,
    roomNumber,
    ownerName,
    studentFaculty,
    studentDept,
    studentLevel,
    whatsapp,
    acceptsHostelDelivery,
    deliveryTimeEstimate,
    imageUrl,
    services,
    isOpen,
  ]);

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setName('');
    setTagline('');
    setDescription('');
    setImageUrl('');
    setServices([{ name: 'Standard Item / Service', price: '1500', description: 'Freshly prepared or delivered on demand.' }]);
    setHasDraft(false);
  };

  if (!isOpen) return null;

  // Authentication Gate: Prevent creating a business without being signed in
  if (!currentUser) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <div 
          className="relative flex flex-col w-full max-w-md overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4">
            <Store className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-extrabold text-white">
            Trader Sign-In Required
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-neutral-300 leading-relaxed">
            You must be signed in with your UNILORIN student or trader account before listing a business. This links your trade to your profile so you can log in, edit prices, manage deliveries, and access your trader dashboard.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onRequireAuth) onRequireAuth();
              }}
              className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs sm:text-sm font-bold text-neutral-950 transition-colors shadow-lg shadow-amber-950/40 cursor-pointer"
            >
              Sign In or Create Account to Continue
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 py-2.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAddServiceRow = () => {
    setServices([...services, { name: '', price: '', description: '' }]);
  };

  const handleRemoveServiceRow = (index: number) => {
    if (services.length <= 1) return;
    setServices(services.filter((_, i) => i !== index));
  };

  const handleServiceChange = (index: number, field: 'name' | 'price' | 'description', value: string) => {
    const updated = [...services];
    updated[index][field] = value;
    setServices(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    // Default image based on category if not provided
    const resolvedImage = imageUrl.trim() || (
      category.includes('Food') 
        ? 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'
        : category.includes('Gadget')
        ? 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
        : category.includes('Fashion')
        ? 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=800&q=80'
        : category.includes('Hair') || category.includes('Barbing')
        ? 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80'
        : 'https://images.unsplash.com/photo-1617347454431-f49d7ff5c3b1?auto=format&fit=crop&w=800&q=80'
    );

    const formattedServices: StudentServiceItem[] = services
      .filter((s) => s.name.trim() !== '')
      .map((s, idx) => ({
        id: `srv_${Date.now()}_${idx}`,
        name: s.name.trim(),
        price: Number(s.price) || 1000,
        description: s.description.trim(),
      }));

    const minPrice = formattedServices.length > 0 
      ? Math.min(...formattedServices.map((s) => s.price)) 
      : 1000;

    const resolvedHostelLocation = `${selectedHostel}${roomNumber.trim() ? `, ${roomNumber.trim()}` : ''}`;

    const newBusiness: StudentBusiness = {
      id: `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      tagline: tagline.trim() || 'Verified student venture on UNILORIN Campus Foundry.',
      description: description.trim() || `${name} provides trusted campus services direct to hostel students.`,
      category,
      university: 'University of Ilorin (UNILORIN)',
      campus,
      hostelLocation: resolvedHostelLocation,
      ownerId: currentUser.id,
      ownerName: currentUser.fullName || ownerName.trim() || 'Student Founder',
      ownerEmail: currentUser.email.toLowerCase().trim(),
      studentFaculty: studentFaculty,
      studentDept: studentDept.trim(),
      studentLevel: studentLevel.trim(),
      whatsapp: whatsapp.replace(/[^0-9]/g, '') || '2348039281744',
      rating: 5.0,
      reviewsCount: 1,
      acceptsHostelDelivery,
      deliveryTimeEstimate: acceptsHostelDelivery ? deliveryTimeEstimate : undefined,
      startingPrice: minPrice,
      services: formattedServices,
      imageUrl: resolvedImage,
      badge: 'New Student Venture',
      verifiedStudent: true,
      activeOrdersToday: 0,
    };

    // Promote user role to trader if previously student
    if (currentUser.role !== 'trader') {
      updateUser({ role: 'trader' });
    }

    // Clear saved draft upon successful listing creation
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}

    onBusinessCreated(newBusiness);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative flex flex-col max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-950/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs border border-amber-500/30">
                <Store className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-white tracking-tight">
                List Your Campus Trade on UNILORIN Foundry
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-neutral-400">
              Start receiving hostel room orders directly to your WhatsApp with zero commission fees.
            </p>
            {currentUser && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1.5 font-mono">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Linked account: <strong>{currentUser.email}</strong> ({currentUser.fullName})</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Persistent Draft Notice */}
        {hasDraft && (
          <div className="bg-amber-950/70 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs text-amber-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Restored unsubmitted listing draft</span>
            </span>
            <button
              type="button"
              onClick={handleClearDraft}
              className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-white hover:underline ml-2 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              <span>Clear Draft</span>
            </button>
          </div>
        )}

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          
          {/* Business Basic Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              1. Business Profile
            </h3>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Business / Brand Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lagos Bakes & Pastries, PS Gadget Care"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Campus Zone *
                </label>
                <select
                  value={campus}
                  onChange={(e) => setCampus(e.target.value as any)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Permanent Site">Permanent Site (PS Hostels)</option>
                  <option value="Tanke Off-Campus">Tanke Off-Campus</option>
                  <option value="Mini Campus">Mini Campus</option>
                  <option value="Sub-Hostels">Sub-Hostels / Private</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Tagline (Catchy 1-sentence summary)
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Flaky warm meat pies and midnight snack boxes delivered to dorms."
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">
                Full Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your student business, specialty items, and how orders work."
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2 px-3 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Student Founder Information */}
          <div className="space-y-3 pt-3 border-t border-neutral-800">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              2. Student Founder & Location
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Founder Name *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Adeyinka Johnson"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-xs sm:text-sm text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Academic Level *
                </label>
                <select
                  value={studentLevel}
                  onChange={(e) => setStudentLevel(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="100 Level">100 Level</option>
                  <option value="200 Level">200 Level</option>
                  <option value="300 Level">300 Level</option>
                  <option value="400 Level">400 Level</option>
                  <option value="500 Level">500 Level</option>
                  <option value="600 Level">600 Level (Medical / Vet)</option>
                  <option value="Postgraduate">Postgraduate (Masters / PhD / IBS)</option>
                </select>
              </div>
            </div>

            {/* Cascading UNILORIN Faculty & Department Selector */}
            <FacultyDepartmentSelector
              selectedFaculty={studentFaculty}
              onFacultyChange={setStudentFaculty}
              selectedDepartment={studentDept}
              onDepartmentChange={setStudentDept}
              labelPrefix="Founder"
              required={true}
            />

            <div className="space-y-3">
              <HostelSelectMenu
                selectedHostel={selectedHostel}
                onHostelChange={setSelectedHostel}
                roomNumber={roomNumber}
                onRoomNumberChange={setRoomNumber}
                showRoomInput={true}
                label="UNILORIN Base Hostel & Room / Block"
                roomPlaceholder="e.g. Block C Room 204"
                required={true}
              />

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  WhatsApp Number (For Direct Orders) *
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="e.g. 08039281744 or 2348039281744"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Delivery Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/60 p-3">
              <div>
                <span className="text-xs font-bold text-white block">Hostel Room Delivery</span>
                <span className="text-[11px] text-neutral-400">Do you or a runner bring orders directly to student rooms?</span>
              </div>
              <input
                type="checkbox"
                checked={acceptsHostelDelivery}
                onChange={(e) => setAcceptsHostelDelivery(e.target.checked)}
                className="h-4 w-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Service / Menu Items Builder */}
          <div className="space-y-3 pt-3 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                3. Menu Items & Services
              </h3>
              <button
                type="button"
                onClick={handleAddServiceRow}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {services.map((srv, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-neutral-950/80 border border-neutral-800 p-2.5 rounded-xl">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <input
                      type="text"
                      required
                      value={srv.name}
                      onChange={(e) => handleServiceChange(idx, 'name', e.target.value)}
                      placeholder="Item name (e.g. Flaky Meat Pie)"
                      className="sm:col-span-5 rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 px-2.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      required
                      value={srv.price}
                      onChange={(e) => handleServiceChange(idx, 'price', e.target.value)}
                      placeholder="Price in ₦ (e.g. 900)"
                      className="sm:col-span-3 rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 px-2.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none font-mono"
                    />
                    <input
                      type="text"
                      value={srv.description}
                      onChange={(e) => handleServiceChange(idx, 'description', e.target.value)}
                      placeholder="Description / size"
                      className="sm:col-span-4 rounded-lg border border-neutral-800 bg-neutral-900 py-1.5 px-2.5 text-xs text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  {services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveServiceRow(idx)}
                      className="text-neutral-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/40"
            >
              Publish Trade Listing
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
