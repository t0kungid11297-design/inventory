import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Html5QrcodeScanner } from 'html5-qrcode';

const SUPABASE_URL = 'https://xskaszpyczkuyyoucikf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MHgORYXynctvylf_Wt1X4g_ALpmSgb-'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AI_AVATAR_URL = 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png';

// --- Helper: เปรียบเทียบสถานะแบบไม่สนตัวพิมพ์เล็ก-ใหญ่ / ช่องว่างเกิน ---
// ป้องกันปัญหากรณีข้อมูลในฐานข้อมูลถูกกรอกมาไม่ตรง case เป๊ะ เช่น "Approved" หรือมี space เกิน
const normalizeStatus = (s) => (s || '').toString().trim().toLowerCase();

const isApprovedStatus = (s) => {
  const n = normalizeStatus(s);
  return n === 'approved' || n === 'อนุมัติเรียบร้อย';
};

const isPendingStatus = (s) => {
  const n = normalizeStatus(s);
  return n === 'pending' || n === 'รอการพิจารณา';
};

const isRejectedStatus = (s) => {
  const n = normalizeStatus(s);
  return n === 'rejected' || n === 'ไม่อนุมัติ';
};

// --- Component ป๊อปอัปสแกน QR Code ---
function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  useEffect(() => {
    if (!isOpen) return;

    let scanner;
    const timer = setTimeout(() => {
      scanner = new Html5QrcodeScanner("reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      }, false);

      scanner.render(
        (decodedText) => {
          onScanSuccess(decodedText);
          scanner.clear();
          onClose();
        },
        () => {}
      );
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalCard, maxWidth: 360, textAlign: 'center' }}>
        <h3 style={{ marginTop: 0, fontSize: 16, color: '#0f172a' }}>สแกน QR Code พัสดุ</h3>
        <div id="reader" style={{ width: '100%', marginTop: 10 }}></div>
        <button 
          onClick={onClose}
          style={{ ...styles.btnCloseModal, width: '100%', marginTop: 15 }}
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  );
}

// --- Component หน้าตั้งค่าระบบ (Super Admin เท่านั้น) ---
function SettingsPanel({ siteSettings, onSave }) {
  const [title, setTitle] = useState(siteSettings.site_title || '');
  const [subtitle, setSubtitle] = useState(siteSettings.site_subtitle || '');

  useEffect(() => {
    setTitle(siteSettings.site_title || '');
    setSubtitle(siteSettings.site_subtitle || '');
  }, [siteSettings.id, siteSettings.site_title, siteSettings.site_subtitle]);

  return (
    <div>
      <div style={{ marginBottom: 15 }}>
        <h4 style={styles.pageTitle}>ตั้งค่าระบบ</h4>
        <span style={styles.pageSubtitle}>แก้ไขหัวข้อและคำอธิบายที่แสดงบนแถบด้านบนของระบบ (Super Admin เท่านั้น)</span>
      </div>
      <div style={{ ...styles.cardLarge, maxWidth: 500 }}>
        <label style={styles.label}>หัวข้อระบบ:</label>
        <input style={styles.input} type="text" value={title} onChange={e => setTitle(e.target.value)} />

        <label style={{ ...styles.label, marginTop: 10 }}>คำอธิบายรอง:</label>
        <input style={styles.input} type="text" value={subtitle} onChange={e => setSubtitle(e.target.value)} />

        <button 
          style={{ ...styles.btnSuccess, marginTop: 15 }} 
          onClick={() => onSave(title, subtitle)}
        >
          บันทึกการตั้งค่า
        </button>
      </div>
    </div>
  );
}


export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('inventory');
  
  // Data States
  const [products, setProducts] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reports, setReports] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [restockLogs, setRestockLogs] = useState([]);
  const [siteSettings, setSiteSettings] = useState({ id: null, site_title: 'ระบบบริหารจัดการคลังสินค้าและพัสดุ TIC', site_subtitle: 'Enterprise Asset & Stock Management System' });
  const [dbErrors, setDbErrors] = useState([]); // เก็บ error จากการดึงข้อมูลที่เคยหายไปเงียบๆ ให้แสดงเป็นแบนเนอร์แทน

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // History Filter States
  const [historyFilterType, setHistoryFilterType] = useState('all');
  const [historyFilterDate, setHistoryFilterDate] = useState('');
  const [historyFilterMonth, setHistoryFilterMonth] = useState('');
  const [historyFilterYear, setHistoryFilterYear] = useState('');
  const [historySearchUser, setHistorySearchUser] = useState('');
  const [historySearchProduct, setHistorySearchProduct] = useState('');

  // Auth States
  const [loginEmpId, setLoginEmpId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regEmpId, setRegEmpId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('Employee');
  const [isRegistering, setIsRegistering] = useState(false);

  // New Product Form
  const [prodName, setProdName] = useState('');
  const [prodCat, setProdCat] = useState('ทั่วไป');
  const [prodQty, setProdQty] = useState(0);
  const [prodMinQty, setProdMinQty] = useState(5);
  const [prodPrice, setProdPrice] = useState(0);
  const [prodImg, setProdImg] = useState('');
  const [prodLoc, setProdLoc] = useState('');
  const [prodPurchaseUrl, setProdPurchaseUrl] = useState('');
  const [prodStorePhone, setProdStorePhone] = useState('');
  const [prodStoreAddress1, setProdStoreAddress1] = useState('');
  const [prodStoreAddress2, setProdStoreAddress2] = useState('');
  const [prodStoreAddress3, setProdStoreAddress3] = useState('');

  // Selected Product & Withdraw Note State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [actionQty, setActionQty] = useState(1);
  const [withdrawNote, setWithdrawNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Report & Inbox Form States
  const [repTitle, setRepTitle] = useState('');
  const [repDesc, setRepDesc] = useState('');
  const [repProdName, setRepProdName] = useState('');
  const [replyTextMap, setReplyTextMap] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);

  // AI Assistant States
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { 
      sender: 'ai', 
      text: 'ระบบช่วยตรวจสอบและจัดการข้อมูลคลังพัสดุ ยินดีให้บริการข้อมูลสต็อกพัสดุ สรุปมูลค่า ค้นหารายการพัสดุ (บอกจำนวนคงเหลือให้เลย) สถิติการเบิก (ใครเบิกเยอะสุด/หมวดหมู่ไหนเยอะสุด) หรือดูประวัติการเบิกของตัวเองได้ครับ พิมพ์คุยเล่นกับผมก็ได้นะครับ 😊', 
      products: [] 
    }
  ]);

  useEffect(() => {
    fetchProducts();
    fetchTransactions();
    fetchReports();
    fetchWithdrawRequests();
    fetchSettings();
    fetchRestockLogs();
  }, []);

  const fetchRestockLogs = async () => {
    const { data, error } = await supabase.from('restock_logs').select('*').order('created_at', { ascending: false });
    if (error) {
      setDbErrors(prev => [...prev.filter(e => e.source !== 'restock_logs'), { source: 'restock_logs', message: error.message }]);
    } else if (data) {
      setDbErrors(prev => prev.filter(e => e.source !== 'restock_logs'));
      setRestockLogs(data);
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').order('id', { ascending: true }).limit(1).single();
    if (data) setSiteSettings(data);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('id', { ascending: true });
    if (data) setProducts(data);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('id', { ascending: true });
    if (data) setUsersList(data);
  };

  // ดึงข้อมูลประวัติการเบิกพัสดุที่อนุมัติแล้วมาแสดงผล (รองรับทั้งภาษาไทยและอังกฤษ)
  const fetchTransactions = async () => {
    // ไม่ใช้ embedded join `products (...)` เพราะมันต้องพึ่ง Foreign Key
    // ระหว่าง withdraw_requests.product_id -> products.id ที่ตั้งไว้ใน Supabase
    // ถ้า FK ไม่ถูกตั้งไว้ (หรือตั้งไม่ตรง) query แบบ join จะ error และคืนค่าว่างเงียบๆ
    // ดึงสองตารางแยกกันแล้วเอามาต่อกันเองฝั่ง JS แทน ปลอดภัยกว่า
    const [reqRes, prodRes] = await Promise.all([
      supabase
        .from('withdraw_requests')
        .select('id, created_at, quantity, status, requested_by, note, product_id, product_name, is_deleted')
        .order('created_at', { ascending: false }),
      supabase.from('products').select('id, price')
    ]);

    const { data, error } = reqRes;
    const priceById = {};
    (prodRes.data || []).forEach(p => { priceById[p.id] = p.price || 0; });

    if (error) {
      console.error('Error fetching history:', error.message);
      setDbErrors(prev => [...prev.filter(e => e.source !== 'transactions'), { source: 'transactions', message: error.message }]);
    } else if (data) {
      setDbErrors(prev => prev.filter(e => e.source !== 'transactions'));
      // กรองเฉพาะรายการที่อนุมัติแล้วฝั่ง JS แทนการกรองใน query ตรงๆ
      // เพราะ .eq() ของ Supabase เทียบตัวพิมพ์เล็ก-ใหญ่แบบเป๊ะ ถ้าข้อมูลใน DB
      // ไม่ตรง case พอดี (เช่น "Approved") แถวนั้นจะหลุดจากรายงานไปเงียบๆ
      const approvedOnly = data.filter(item => isApprovedStatus(item.status) && !item.is_deleted);
      const formattedData = approvedOnly.map(item => {
        const dateObj = new Date(item.created_at);
        const unitPrice = priceById[item.product_id] || 0;
        const quantity = item.quantity || 0;
        return {
          id: item.id,
          created_at: item.created_at,
          dateObj,
          productName: item.product_name || 'ไม่ระบุ',
          quantity,
          user: item.requested_by || 'ไม่ระบุ',
          unitPrice,
          totalPrice: unitPrice * quantity,
          rawDetails: item.note || '-'
        };
      });
      setTransactions(formattedData);
    }
  };

  const fetchReports = async () => {
    const { data } = await supabase.from('reports').select('*').order('id', { ascending: false });
    if (data) setReports(data.filter(r => !r.is_deleted));
  };

  const fetchWithdrawRequests = async () => {
    const { data, error } = await supabase.from('withdraw_requests').select('*').order('id', { ascending: false });
    if (error) {
      setDbErrors(prev => [...prev.filter(e => e.source !== 'withdraw_requests'), { source: 'withdraw_requests', message: error.message }]);
    } else if (data) {
      setDbErrors(prev => prev.filter(e => e.source !== 'withdraw_requests'));
      setWithdrawRequests(data.filter(r => !r.is_deleted));
    }
  };

  const handleScanSuccess = (decodedText) => {
    const matchedProduct = products.find(p => p.qr_code === decodedText || (p.name || '').toLowerCase() === decodedText.toLowerCase());
    if (matchedProduct) {
      openProductDetail(matchedProduct);
    } else {
      setSearchTerm(decodedText);
      alert(`สแกนสำเร็จ: "${decodedText}" (ค้นหาในรายการพัสดุ)`);
    }
  };

  // ป้องกันการฉีด HTML/สคริปต์เข้าไปในหน้าต่างพิมพ์สติกเกอร์ ในกรณีชื่อ/ที่จัดเก็บมีอักขระพิเศษ
  const escapeHtml = (str) => {
    return (str || '').toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // พิมพ์สติกเกอร์พัสดุ: ชื่อ + QR Code + สถานที่จัดเก็บ
  const handlePrintSticker = (product) => {
    const qrData = product.qr_code || product.name || '';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;
    const printWindow = window.open('', '_blank', 'width=420,height=560');
    if (!printWindow) {
      alert('เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์นี้เพื่อพิมพ์สติกเกอร์');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>สติกเกอร์พัสดุ - ${escapeHtml(product.name)}</title>
          <style>
            @page { size: 80mm 50mm; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: 'Tahoma', 'Sarabun', sans-serif; margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; }
            .sticker { width: 78mm; min-height: 48mm; padding: 6mm; border: 1px dashed #94a3b8; text-align: center; }
            .sticker h2 { font-size: 14px; margin: 0 0 4px 0; color: #0f172a; word-break: break-word; }
            .sticker img { width: 100px; height: 100px; margin: 4px 0; }
            .sticker p { font-size: 11px; margin: 2px 0; color: #334155; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="sticker">
            <h2>${escapeHtml(product.name)}</h2>
            <img src="${qrUrl}" alt="QR" />
            <p><b>ที่จัดเก็บ:</b> ${escapeHtml(product.location || 'ไม่ระบุ')}</p>
            <p><b>รหัส:</b> ${escapeHtml(product.qr_code || '-')}</p>
          </div>
          <script>
            window.onload = function () {
              setTimeout(function () { window.print(); }, 350);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Auth Handling
  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('emp_id', loginEmpId)
      .eq('password', loginPassword)
      .single();

    if (error || !data) {
      alert('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบข้อมูลอีกครั้ง');
      return;
    }
    if (data.status !== 'approved') {
      alert('บัญชีนี้อยู่ระหว่างรอการอนุมัติสิทธิ์การใช้งานจากผู้ดูแลระบบ');
      return;
    }
    setCurrentUser(data);
    if (data.role === 'Admin') fetchUsers();
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('users').insert([
      { emp_id: regEmpId, password: regPassword, role: regRole, status: 'pending' }
    ]);
    if (error) {
      alert('เกิดข้อผิดพลาดในการลงทะเบียน หรือมีรหัสพนักงานนี้ในระบบแล้ว');
    } else {
      alert('บันทึกข้อมูลการลงทะเบียนเรียบร้อยแล้ว โปรดรอผู้ดูแลระบบพิจารณาอนุมัติ');
      setIsRegistering(false);
    }
  };

  // User Management Actions (Admin)
  const handleApproveUser = async (userId) => {
    await supabase.from('users').update({ status: 'approved' }).eq('id', userId);
    fetchUsers();
  };

  const handleChangeUserPassword = async (user) => {
    const newPassword = prompt(`กรุณากรอกรหัสผ่านใหม่สำหรับพนักงาน: ${user.emp_id}`);
    if (!newPassword) return;

    const { error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', user.id);

    if (error) {
      alert('ไม่สามารถเปลี่ยนรหัสผ่านได้: ' + error.message);
    } else {
      alert(`เปลี่ยนรหัสผ่านสำหรับพนักงาน ${user.emp_id} เรียบร้อยแล้ว`);
      fetchUsers();
    }
  };

  const handleChangeUserRole = async (user, newRole) => {
    if (!window.confirm(`ยืนยันการเปลี่ยนสิทธิ์ของ "${user.emp_id}" เป็น "${newRole}"?`)) return;
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', user.id);
    if (error) {
      alert('ไม่สามารถเปลี่ยนสิทธิ์ผู้ใช้งานได้: ' + error.message);
    } else {
      fetchUsers();
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.emp_id === currentUser.emp_id) {
      alert('ไม่สามารถลบบัญชีผู้ใช้งานปัจจุบันของท่านได้');
      return;
    }
    if (user.role === 'Super Admin' && currentUser.role !== 'Super Admin') {
      alert('ไม่มีสิทธิ์ลบบัญชีระดับ Super Admin');
      return;
    }

    if (window.confirm(`ยืนยันการลบผู้ใช้งาน "${user.emp_id}" ออกจากระบบองค์กร?`)) {
      const { error } = await supabase.from('users').delete().eq('id', user.id);
      if (error) {
        alert('ไม่สามารถลบผู้ใช้งานได้: ' + error.message);
      } else {
        alert('ลบข้อมูลผู้ใช้งานเรียบร้อยแล้ว');
        fetchUsers();
      }
    }
  };

  // Product Actions
  const handleAddProduct = async (e) => {
    e.preventDefault();
    const qrCodeValue = `PROD-${Date.now()}`;
    const payload = {
      name: prodName,
      category: prodCat.trim() || 'ทั่วไป',
      quantity: parseInt(prodQty) || 0,
      min_quantity: parseInt(prodMinQty) || 5,
      price: parseFloat(prodPrice) || 0,
      image_url: prodImg,
      location: prodLoc,
      purchase_url: prodPurchaseUrl,
      store_phone: prodStorePhone,
      store_address: prodStoreAddress1,
      store_address2: prodStoreAddress2,
      store_address3: prodStoreAddress3,
      qr_code: qrCodeValue
    };
    const { error } = await supabase.from('products').insert([payload]);
    if (error) {
      alert('ไม่สามารถเพิ่มรายการพัสดุได้: ' + error.message);
    } else {
      // บันทึกจำนวนเริ่มต้นเป็นประวัติการเติมสต็อกด้วย (ถือเป็นของเข้าคลังครั้งแรก)
      if (payload.quantity > 0) {
        await supabase.from('restock_logs').insert([{
          product_name: payload.name,
          quantity: payload.quantity,
          added_by: currentUser?.emp_id || 'ไม่ระบุ'
        }]);
        fetchRestockLogs();
      }
      alert('เพิ่มรายการพัสดุใหม่เข้าสู่ระบบเรียบร้อยแล้ว');
      setProdName(''); setProdQty(0); setProdPrice(0); setProdImg(''); setProdLoc(''); setProdPurchaseUrl(''); setProdStorePhone(''); 
      setProdStoreAddress1(''); setProdStoreAddress2(''); setProdStoreAddress3('');
      fetchProducts();
    }
  };

  const handleSaveEditProduct = async () => {
    const updatePayload = {
      name: editData.name,
      category: editData.category ? editData.category.trim() : 'ทั่วไป',
      quantity: editData.quantity === '' ? 0 : parseInt(editData.quantity),
      min_quantity: editData.min_quantity === '' || editData.min_quantity == null ? 5 : parseInt(editData.min_quantity),
      price: editData.price === '' ? 0 : parseFloat(editData.price),
      location: editData.location || '',
      purchase_url: editData.purchase_url || '',
      store_phone: editData.store_phone || '',
      store_address: editData.store_address || '',
      store_address2: editData.store_address2 || '',
      store_address3: editData.store_address3 || '',
      image_url: editData.image_url || ''
    };
    const { error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', editData.id);

    if (error) {
      alert('ไม่สามารถอัปเดตข้อมูลพัสดุได้: ' + error.message);
    } else {
      alert('บันทึกการแก้ไขข้อมูลพัสดุเรียบร้อยแล้ว');
      setIsEditing(false);
      setSelectedProduct(null);
      fetchProducts();
    }
  };

  // Withdraw Actions
  const handleRequestWithdraw = async (product) => {
    const qty = parseInt(actionQty) || 1;
    if (!withdrawNote.trim()) {
      alert('โปรดระบุวัตถุประสงค์ในการเบิกพัสดุ');
      return;
    }
    if (product.quantity < qty) {
      alert('จำนวนพัสดุในคลังคงเหลือไม่เพียงพอสำหรับการเบิก');
      return;
    }
    const payload = {
      product_id: product.id,
      product_name: product.name,
      quantity: qty,
      requested_by: currentUser.emp_id,
      note: withdrawNote,
      status: 'pending'
    };
    const { error } = await supabase.from('withdraw_requests').insert([payload]);
    if (!error) {
      alert('ส่งคำขออนุมัติเบิกพัสดุเรียบร้อยแล้ว โปรดรอผู้ดูแลระบบดำเนินการอนุมัติ');
      setSelectedProduct(null);
      setWithdrawNote('');
      fetchWithdrawRequests();
    } else {
      alert('เกิดข้อผิดพลาดในการส่งคำขอเบิก: ' + error.message);
    }
  };

  const handleApproveWithdrawRequest = async (req) => {
    const { data: prodData } = await supabase.from('products').select('*').eq('id', req.product_id).single();
    
    if (!prodData || prodData.quantity < req.quantity) {
      alert('ไม่สามารถอนุมัติได้ เนื่องจากสต็อกพัสดุในคลังมีไม่เพียงพอ');
      return;
    }
    const newQty = prodData.quantity - req.quantity;

    await supabase.from('products').update({ quantity: newQty }).eq('id', req.product_id);
    await supabase.from('withdraw_requests').update({ status: 'approved' }).eq('id', req.id);

    alert('ดำเนินการอนุมัติการเบิกพัสดุเรียบร้อยแล้ว');
    fetchProducts();
    fetchTransactions();
    fetchWithdrawRequests();
  };

  const handleRejectWithdrawRequest = async (reqId) => {
    if (window.confirm('ยืนยันการปฏิเสธคำขอเบิกพัสดุรายการนี้?')) {
      await supabase.from('withdraw_requests').update({ status: 'rejected' }).eq('id', reqId);
      alert('ดำเนินการปฏิเสธคำขอเบิกเรียบร้อยแล้ว');
      fetchWithdrawRequests();
    }
  };

  // Soft-delete: ซ่อนรายการจากหน้าจอปกติ (ทั้งแท็บอนุมัติเบิก และรายงานประวัติ) แต่ไม่ลบข้อมูลจริงออกจาก Supabase
  // สงวนสิทธิ์ไว้เฉพาะ Super Admin เพื่อรักษาความสามารถในการตรวจสอบย้อนหลัง (accountability)
  const handleSoftDeleteWithdrawRequest = async (reqId) => {
    if (currentUser.role !== 'Super Admin') return;
    if (!window.confirm('ยืนยันการลบรายการนี้ออกจากหน้าจอ? (ข้อมูลจะยังถูกเก็บไว้ในระบบเพื่อการตรวจสอบย้อนหลัง)')) return;
    const { error } = await supabase.from('withdraw_requests').update({ is_deleted: true }).eq('id', reqId);
    if (error) {
      alert('ไม่สามารถลบรายการได้: ' + error.message);
    } else {
      fetchWithdrawRequests();
      fetchTransactions();
    }
  };

  const handleRestock = async (product, amount) => {
    const qty = parseInt(amount) || 1;
    const newQty = product.quantity + qty;
    const { error } = await supabase.from('products').update({ quantity: newQty }).eq('id', product.id);
    if (!error) {
      // บันทึกประวัติการเติมสต็อก (stock-in log)
      await supabase.from('restock_logs').insert([{
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        added_by: currentUser?.emp_id || 'ไม่ระบุ'
      }]);
      alert('เพิ่มพัสดุเข้าคลังสต็อกเรียบร้อยแล้ว');
      setSelectedProduct(null);
      fetchProducts();
      fetchTransactions();
      fetchRestockLogs();
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('ยืนยันการลบรายการพัสดุนี้ออกจากระบบคลัง?')) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        alert('ลบรายการพัสดุเรียบร้อยแล้ว');
        setSelectedProduct(null);
        fetchProducts();
      }
    }
  };

  // AI Assistant Engine
  const processAiQuery = (queryText) => {
    if (!queryText.trim()) return;
    setAiMessages(prev => [...prev, { sender: 'user', text: queryText, products: [] }]);

    setTimeout(() => {
      let replyText = '';
      let matchedProds = [];
      const queryLower = queryText.toLowerCase();

      if (queryLower.includes('กี่ชิ้น') || queryLower.includes('กี่รายการ') || queryLower.includes('ทั้งหมดมี') || queryLower.includes('สรุปสต็อก') || queryLower.includes('มีของทั้งหมด')) {
        const totalItemsCount = products.length;
        const totalQtyCount = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
        replyText = `📊 รายงานสรุปพัสดุในคลัง:\n\n• จำนวนชนิดพัสดุทั้งหมด: ${totalItemsCount} รายการ\n• จำนวนหน่วยพัสดุรวม: ${totalQtyCount.toLocaleString()} หน่วย`;
      } 
      else if (queryLower.includes('ใกล้หมด') || queryLower.includes('หมด') || queryLower.includes('ของขาด') || queryLower.includes('ต้องเติม') || queryLower.includes('เตือน')) {
        const lowStockList = products.filter(p => p.quantity <= (p.min_quantity || 5));
        if (lowStockList.length > 0) {
          replyText = `⚠️ รายการพัสดุที่มีระดับสต็อกต่ำกว่าเกณฑ์ (${lowStockList.length} รายการ):`;
          matchedProds = lowStockList;
        } else {
          replyText = '✅ สภาพการจัดเก็บพัสดุอยู่ในระดับปกติ ไม่มีรายการพัสดุต่ำกว่าเกณฑ์';
        }
      } 
      else if (queryLower.includes('มูลค่า') || queryLower.includes('ยอดรวม') || queryLower.includes('รวมราคา') || queryLower.includes('ทั้งหมดราคา') || queryLower.includes('เท่าไหน') || queryLower.includes('เท่าไหร่')) {
        const totalValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.price || 0)), 0);
        const totalQtyCount = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
        
        replyText = `💰 สรุปประเมินมูลค่าพัสดุคงคลัง:\n\n• มูลค่ารวมสุทธิ: ${totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\n• คำนวณจากจำนวนพัสดุรวม ${totalQtyCount.toLocaleString()} หน่วย (${products.length} รายการ)`;
      }
      // --- คำถามเชิงวิเคราะห์: ใครเติมสต็อกเยอะสุด ---
      else if (
        (queryLower.includes('ใคร') && (queryLower.includes('เติม') || queryLower.includes('เพิ่มของ') || queryLower.includes('เพิ่มสต็อก'))) ||
        queryLower.includes('ผู้เติมสต็อกสูงสุด') ||
        queryLower.includes('คนเติมเยอะสุด')
      ) {
        if (restockLogs.length === 0) {
          replyText = 'ยังไม่มีข้อมูลประวัติการเติมสต็อกในระบบครับ';
        } else {
          const restockUserMap = restockLogs.reduce((acc, log) => {
            const key = log.added_by || 'ไม่ระบุ';
            if (!acc[key]) acc[key] = { user: key, times: 0, totalQty: 0 };
            acc[key].times += 1;
            acc[key].totalQty += (log.quantity || 0);
            return acc;
          }, {});
          const topRestocker = Object.values(restockUserMap).sort((a, b) => b.totalQty - a.totalQty)[0];
          replyText = `🏆 ผู้ที่เติมสต็อกมากที่สุดคือ "${topRestocker.user}"\n\n• เติมรวม: ${topRestocker.totalQty.toLocaleString()} หน่วย\n• จำนวนครั้งที่เติม: ${topRestocker.times} ครั้ง`;
        }
      }
      // --- คำถามเชิงวิเคราะห์: ใครเบิกเยอะสุด (ต้องมีคำที่บ่งชี้ "คน" ด้วย ไม่ใช่แค่ "เบิกเยอะสุด" เฉยๆ เพราะจะชนกับคำถามเรื่อง "สินค้า" ที่เบิกเยอะสุด) ---
      else if (
        (queryLower.includes('ใคร') && (queryLower.includes('เบิก') || queryLower.includes('ขอเบิก'))) ||
        queryLower.includes('ผู้เบิกสูงสุด') ||
        queryLower.includes('คนเบิกเยอะสุด') ||
        queryLower.includes('คนที่เบิกเยอะสุด') ||
        queryLower.includes('พนักงานที่เบิก')
      ) {
        if (transactions.length === 0) {
          replyText = 'ยังไม่มีข้อมูลประวัติการเบิกที่อนุมัติแล้วในระบบครับ';
        } else {
          const { topUser } = computeAnalytics(transactions);
          replyText = topUser
            ? `🏆 ผู้ที่เบิกพัสดุมากที่สุดคือ "${topUser.user}"\n\n• เบิกรวม: ${topUser.totalQty.toLocaleString()} หน่วย\n• จำนวนครั้งที่เบิก: ${topUser.times} ครั้ง`
            : 'ไม่พบข้อมูลผู้เบิกในระบบครับ';
        }
      }
      // --- คำถามเชิงวิเคราะห์: พัสดุที่ถูกเบิกเยอะสุด ---
      else if (queryLower.includes('ถูกเบิกเยอะ') || queryLower.includes('เบิกบ่อยสุด') || queryLower.includes('พัสดุที่เบิก') || queryLower.includes('สินค้าที่เบิก') || queryLower.includes('อะไรถูกเบิก') || queryLower.includes('เบิกเยอะสุด') || queryLower.includes('เบิกมากที่สุด')) {
        if (transactions.length === 0) {
          replyText = 'ยังไม่มีข้อมูลประวัติการเบิกที่อนุมัติแล้วในระบบครับ';
        } else {
          const { topProduct } = computeAnalytics(transactions);
          replyText = topProduct
            ? `📦 พัสดุที่ถูกเบิกมากที่สุดคือ "${topProduct.name}"\n\n• ถูกเบิกรวม: ${topProduct.totalQty.toLocaleString()} หน่วย\n• จำนวนครั้งที่ถูกเบิก: ${topProduct.times} ครั้ง`
            : 'ไม่พบข้อมูลการเบิกพัสดุในระบบครับ';
        }
      }
      // --- บทสนทนาทั่วไป ---
      else if (queryLower.includes('สวัสดี') || queryLower.includes('หวัดดี') || /^hi\b|^hello\b/.test(queryLower)) {
        replyText = 'สวัสดีครับ 👋 มีอะไรให้ช่วยเช็คเรื่องคลังพัสดุไหมครับ เช่น สต็อกใกล้หมด มูลค่าคงคลัง หรือใครเบิกของเยอะสุด';
      }
      else if (queryLower.includes('กินข้าว') || queryLower.includes('ทานข้าว') || queryLower.includes('หิว')) {
        replyText = 'ผมเป็นระบบ AI ไม่ได้กินข้าวครับ 😄 แต่พร้อมช่วยเช็คข้อมูลคลังพัสดุให้ตลอดเลย ลองถามอะไรเกี่ยวกับสต็อกได้เลยครับ';
      }
      else if (queryLower.includes('เป็นไงบ้าง') || queryLower.includes('เป็นอย่างไร') || queryLower.includes('สบายดี') || queryLower.includes('วันนี้เป็นไง')) {
        replyText = 'ผมพร้อมทำงานตลอดครับ 🙂 วันนี้อยากให้ช่วยดูเรื่องอะไรของคลังพัสดุดีครับ';
      }
      else if (queryLower.includes('ทำอะไรอยู่') || queryLower.includes('กำลังทำอะไร') || (queryLower.includes('ทำอะไร') && !queryLower.includes('ทำอย่างไร'))) {
        replyText = 'ตอนนี้ผมเฝ้าดูข้อมูลคลังพัสดุอยู่ครับ พร้อมตอบคำถามเรื่องสต็อก มูลค่า หรือสถิติการเบิกได้ทันทีเลย';
      }
      else if (queryLower.includes('ขอบคุณ') || queryLower.includes('thank')) {
        replyText = 'ยินดีครับ 😊 มีอะไรให้ช่วยเพิ่มเติมอีกไหมครับ';
      }
      // --- ประวัติการเบิกของฉัน (ผู้ใช้ที่ล็อกอินอยู่) ---
      else if (queryLower.includes('ประวัติของฉัน') || queryLower.includes('ประวัติผม') || queryLower.includes('ฉันเบิก') || queryLower.includes('ผมเบิก') || (queryLower.includes('เบิก') && queryLower.includes('ของฉัน'))) {
        const myEmpId = (currentUser?.emp_id || '').toLowerCase();
        const myHistory = transactions.filter(t => (t.user || '').toLowerCase() === myEmpId);
        if (myHistory.length === 0) {
          replyText = 'ยังไม่พบประวัติการเบิกพัสดุที่อนุมัติแล้วของคุณในระบบครับ';
        } else {
          const totalQty = myHistory.reduce((sum, t) => sum + t.quantity, 0);
          const recentList = myHistory.slice(0, 5)
            .map(t => `• ${t.productName} จำนวน ${t.quantity} หน่วย (${t.dateObj.toLocaleDateString('th-TH')})`)
            .join('\n');
          replyText = `📋 ประวัติการเบิกของคุณ (${currentUser.emp_id}):\n\n• เบิกไปแล้วทั้งหมด: ${myHistory.length} ครั้ง รวม ${totalQty.toLocaleString()} หน่วย\n\nรายการล่าสุด:\n${recentList}`;
        }
      }
      // --- หมวดหมู่ที่มีพัสดุเยอะสุด/น้อยสุด ---
      else if (queryLower.includes('หมวดหมู่')) {
        if (products.length === 0) {
          replyText = 'ยังไม่มีข้อมูลพัสดุในระบบครับ';
        } else {
          const catMap = {};
          products.forEach(p => {
            const cat = (p.category || 'ทั่วไป').trim();
            catMap[cat] = (catMap[cat] || 0) + (p.quantity || 0);
          });
          const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
          const [topCatName, topCatQty] = sortedCats[0];
          const [lowCatName, lowCatQty] = sortedCats[sortedCats.length - 1];
          if (queryLower.includes('น้อยสุด') || queryLower.includes('น้อยที่สุด')) {
            replyText = `📉 หมวดหมู่ที่มีพัสดุน้อยที่สุดคือ "${lowCatName}"\n\n• จำนวนรวม: ${lowCatQty.toLocaleString()} หน่วย`;
          } else {
            replyText = `📊 หมวดหมู่ที่มีพัสดุเยอะที่สุดคือ "${topCatName}"\n\n• จำนวนรวม: ${topCatQty.toLocaleString()} หน่วย\n\nหมวดหมู่ที่น้อยที่สุด: "${lowCatName}" (${lowCatQty.toLocaleString()} หน่วย)`;
          }
        }
      }
      else {
        let cleanQuery = queryLower
          .replace(/(มี|มั้ย|ไหม|ครับ|คะ|ค่ะ|อยากทราบ|ช่วยเช็ค|เช็ค|สอบถาม|หน่อย|หรือเปล่า|ค้นหา|เหลือ|คงเหลือ|กี่ชิ้น|กี่หน่วย)/g, '')
          .trim();
        if (!cleanQuery) cleanQuery = queryLower;

        matchedProds = products.filter(p => {
          const pName = (p.name || '').toLowerCase();
          const pCat = (p.category || '').toLowerCase();
          const pLoc = (p.location || '').toLowerCase();
          return pName.includes(cleanQuery) || cleanQuery.includes(pName) || pCat.includes(cleanQuery) || pLoc.includes(cleanQuery);
        });

        if (matchedProds.length === 1) {
          // ถ้าเจอสินค้าตรงตัวรายการเดียว ตอบจำนวนคงเหลือ/ราคาตรงๆ ในข้อความเลย ไม่ต้องเปิดการ์ดดู
          const p = matchedProds[0];
          const stockNote = p.quantity <= (p.min_quantity || 5) ? ' ⚠️ ใกล้หมดแล้ว ควรเติมสต็อก' : '';
          replyText = `📦 "${p.name}"\n\n• คงเหลือ: ${(p.quantity || 0).toLocaleString()} หน่วย${stockNote}\n• ราคาต่อหน่วย: ${(p.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\n• สถานที่จัดเก็บ: ${p.location || 'ไม่ระบุ'}`;
        } else if (matchedProds.length > 1) {
          replyText = `🔎 ผลการค้นหาพัสดุที่เกี่ยวข้อง (${matchedProds.length} รายการ):`;
        } else {
          replyText = `ไม่พบข้อมูลรายการพัสดุที่ตรงกับเงื่อนไข "${cleanQuery}" ในระบบ`;
        }
      }

      setAiMessages(prev => [...prev, { sender: 'ai', text: replyText, products: matchedProds }]);
    }, 300);
  };

  const handleAiSend = (e) => {
    e.preventDefault();
    processAiQuery(aiQuery);
    setAiQuery('');
  };

  const openProductDetail = (product) => {
    setSelectedProduct(product);
    setEditData({ ...product });
    setActionQty(1);
    setWithdrawNote('');
    setIsEditing(false);
  };

  // Inbox & Reply System
  const handleCreateReport = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('reports').insert([
      {
        title: repTitle,
        description: repDesc,
        product_name: repProdName,
        reported_by: currentUser.emp_id,
        status: 'pending'
      }
    ]);
    if (!error) {
      alert('บันทึกคำร้องและส่งไปยังผู้ดูแลระบบเรียบร้อยแล้ว');
      setRepTitle(''); setRepDesc(''); setRepProdName('');
      fetchReports();
    } else {
      alert('ไม่สามารถส่งคำร้องได้: ' + error.message);
    }
  };

  const handleSendReply = async (reportId) => {
    const replyText = replyTextMap[reportId];
    if (!replyText || !replyText.trim()) {
      alert('โปรดระบุข้อความตอบกลับก่อนทำรายการ');
      return;
    }

    const replyMessage = `[ตอบโดย ${currentUser.emp_id}]: ${replyText}`;

    const { error } = await supabase
      .from('reports')
      .update({ 
        reply: replyMessage, 
        status: 'resolved' 
      })
      .eq('id', reportId);

    if (!error) {
      alert('บันทึกข้อความตอบกลับเรียบร้อยแล้ว');
      setReplyTextMap(prev => ({ ...prev, [reportId]: '' }));
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(prev => ({ ...prev, reply: replyMessage, status: 'resolved' }));
      }
      fetchReports();
    } else {
      alert('ไม่สามารถตอบกลับคำร้องได้: ' + error.message);
    }
  };

  // Soft-delete: ซ่อนจดหมายแจ้งปัญหาจากหน้าจอปกติ แต่ไม่ลบออกจาก Supabase จริง (Super Admin เท่านั้น)
  const handleSoftDeleteReport = async (reportId) => {
    if (currentUser.role !== 'Super Admin') return;
    if (!window.confirm('ยืนยันการลบจดหมายฉบับนี้ออกจากหน้าจอ? (ข้อมูลจะยังถูกเก็บไว้ในระบบเพื่อการตรวจสอบย้อนหลัง)')) return;
    const { error } = await supabase.from('reports').update({ is_deleted: true }).eq('id', reportId);
    if (error) {
      alert('ไม่สามารถลบจดหมายได้: ' + error.message);
    } else {
      if (selectedReport && selectedReport.id === reportId) setSelectedReport(null);
      fetchReports();
    }
  };

  // บันทึกการตั้งค่าหัวข้อระบบ (Super Admin เท่านั้น)
  const handleSaveSettings = async (newTitle, newSubtitle) => {
    if (currentUser.role !== 'Super Admin') return;
    if (!siteSettings.id) {
      alert('ไม่พบแถวการตั้งค่าในตาราง settings — ตรวจสอบว่ารัน SQL สร้างตาราง settings แล้วหรือยัง');
      return;
    }
    const { error } = await supabase
      .from('settings')
      .update({ site_title: newTitle, site_subtitle: newSubtitle, updated_at: new Date().toISOString() })
      .eq('id', siteSettings.id);
    if (error) {
      alert('ไม่สามารถบันทึกการตั้งค่าได้: ' + error.message);
    } else {
      alert('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว');
      fetchSettings();
    }
  };

  const exportToCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categoriesList = ['all', ...Array.from(new Set(products.map(p => (p.category || 'ทั่วไป').trim())))];

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    const pCategory = (p.category || 'ทั่วไป').trim();
    
    const matchesSearch = (p.name || '').toLowerCase().includes(term) ||
                          pCategory.toLowerCase().includes(term) ||
                          (p.location || '').toLowerCase().includes(term);
    
    const matchesCategory = selectedCategory === 'all' || pCategory === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // ใช้ข้อมูลรายการเบิกที่แปลงแล้วจาก transactions โดยตรง
  const filteredWithdrawals = transactions.filter(w => {
    if (!w || !w.dateObj) return false;
    const d = w.dateObj;
    const yearStr = d.getFullYear().toString();
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (historyFilterType === 'day' && historyFilterDate && dateStr !== historyFilterDate) return false;
    if (historyFilterType === 'month' && historyFilterMonth && monthStr !== historyFilterMonth) return false;
    if (historyFilterType === 'year' && historyFilterYear && yearStr !== historyFilterYear) return false;

    if (historySearchUser && !w.user.toLowerCase().includes(historySearchUser.toLowerCase())) return false;
    if (historySearchProduct && !w.productName.toLowerCase().includes(historySearchProduct.toLowerCase())) return false;

    return true;
  });

  const computeAnalytics = (dataList) => {
    let totalQty = 0;
    let totalCost = 0;
    const userMap = {};
    const prodMap = {};

    dataList.forEach(item => {
      totalQty += item.quantity;
      totalCost += item.totalPrice;

      if (!userMap[item.user]) userMap[item.user] = { user: item.user, totalQty: 0, totalCost: 0, times: 0 };
      userMap[item.user].totalQty += item.quantity;
      userMap[item.user].totalCost += item.totalPrice;
      userMap[item.user].times += 1;

      if (!prodMap[item.productName]) prodMap[item.productName] = { name: item.productName, totalQty: 0, totalCost: 0, times: 0 };
      prodMap[item.productName].totalQty += item.quantity;
      prodMap[item.productName].totalCost += item.totalPrice;
      prodMap[item.productName].times += 1;
    });

    const topUsers = Object.values(userMap).sort((a, b) => b.totalQty - a.totalQty);
    const topProducts = Object.values(prodMap).sort((a, b) => b.totalQty - a.totalQty);

    return {
      totalQty,
      totalCost,
      topUser: topUsers[0] || null,
      topProduct: topProducts[0] || null
    };
  };

  const analytics = computeAnalytics(filteredWithdrawals);
  const pendingWithdrawCount = withdrawRequests.filter(r => isPendingStatus(r.status)).length;
  const pendingReportsCount = reports.filter(r => r.status !== 'resolved').length;

  if (!currentUser) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loginHeader}>
            <h2 style={styles.title}>
              {isRegistering ? 'ลงทะเบียนเข้าใช้งานระบบ' : siteSettings.site_title}
            </h2>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>ระบบสารสนเทศเพื่อการจัดการภายในองค์กร</p>
          </div>
          {!isRegistering ? (
            <form onSubmit={handleLogin} style={styles.form}>
              <label style={styles.label}>รหัสประจำตัวพนักงาน / บุคลากร:</label>
              <input style={styles.input} type="text" placeholder="ระบุรหัสพนักงาน" value={loginEmpId} onChange={e => setLoginEmpId(e.target.value)} required />
              
              <label style={styles.label}>รหัสผ่านเข้าระบบ:</label>
              <input style={styles.input} type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              
              <button style={styles.btnPrimary} type="submit">เข้าสู่ระบบ</button>
              <p style={styles.linkText} onClick={() => setIsRegistering(true)}>ยังไม่มีบัญชีผู้ใช้งาน? ลงทะเบียนที่นี่</p>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={styles.form}>
              <label style={styles.label}>รหัสประจำตัวพนักงาน / บุคลากร:</label>
              <input style={styles.input} type="text" placeholder="ระบุรหัสพนักงาน" value={regEmpId} onChange={e => setRegEmpId(e.target.value)} required />
              
              <label style={styles.label}>กำหนดรหัสผ่าน:</label>
              <input style={styles.input} type="password" placeholder="กำหนดรหัสผ่าน" value={regPassword} onChange={e => setRegPassword(e.target.value)} required />
              
              <label style={styles.label}>สิทธิ์การใช้งาน (Role):</label>
              <select style={styles.input} value={regRole} onChange={e => setRegRole(e.target.value)}>
                <option value="Employee">พนักงานทั่วไป (ขอเบิกพัสดุ)</option>
                <option value="Restocker">เจ้าหน้าที่คลังสินค้า (เติม/จัดการพัสดุ)</option>
                <option value="Admin">ผู้ดูแลระบบ (อนุมัติ/บริหารจัดการสิทธิ์)</option>
              </select>
              <button style={styles.btnSuccess} type="submit">ยืนยันลงทะเบียน</button>
              <p style={styles.linkText} onClick={() => setIsRegistering(false)}>มีบัญชีผู้ใช้งานแล้ว? เข้าสู่ระบบ</p>
            </form>
          )}
        </div>
      </div>
    );
  }

  const isAdminLevel = currentUser.role === 'Admin' || currentUser.role === 'Super Admin';
  const isSuperAdmin = currentUser.role === 'Super Admin';

  return (
    <div style={styles.appWrapper}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.logoBadge}>INVENTORY</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: '700', letterSpacing: '0.5px' }}>{siteSettings.site_title}</h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>{siteSettings.site_subtitle}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right', fontSize: 12 }}>
            <div style={{ fontWeight: '600' }}>รหัสผู้ใช้งาน: {currentUser.emp_id}</div>
            <div style={{ color: '#cbd5e1', fontSize: 11 }}>สถานะ: {currentUser.role}</div>
          </div>
          <button style={styles.btnLogout} onClick={() => setCurrentUser(null)}>ออกจากระบบ</button>
        </div>
      </header>

      {isAdminLevel && dbErrors.length > 0 && (
        <div style={{ backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#991b1b', padding: '8px 20px', fontSize: 12 }}>
          ⚠️ พบปัญหาในการดึงข้อมูลบางส่วน (แสดงเฉพาะ Admin/Super Admin เท่านั้น):
          <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
            {dbErrors.map((err, idx) => (
              <li key={idx}><b>{err.source}</b>: {err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation Bar */}
      <div style={styles.navBar}>
        <button style={activeTab === 'inventory' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('inventory')}>รายการพัสดุคงคลัง</button>
        
        <button style={activeTab === 'withdraw_requests' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('withdraw_requests')}>
          รายการอนุมัติเบิกพัสดุ {pendingWithdrawCount > 0 && <span style={styles.badge}>{pendingWithdrawCount}</span>}
        </button>

        {isAdminLevel && (
          <>
            <button style={activeTab === 'add' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('add')}>เพิ่มรายการพัสดุ</button>
            <button style={activeTab === 'users' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('users')}>จัดการสิทธิ์ผู้ใช้งาน</button>
          </>
        )}

        {isSuperAdmin && (
          <button style={activeTab === 'settings' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('settings')}>ตั้งค่าระบบ</button>
        )}

        <button style={activeTab === 'reports' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('reports')}>
          ศูนย์รับแจ้งข้อผิดพลาด {pendingReportsCount > 0 && <span style={styles.badge}>{pendingReportsCount}</span>}
        </button>
        
        <button style={activeTab === 'history' ? styles.navActive : styles.navBtn} onClick={() => setActiveTab('history')}>รายงานประวัติ & สถิติ</button>
      </div>

      <div style={styles.content}>
        {/* Inventory View */}
        {activeTab === 'inventory' && (
          <div>
            <div style={styles.flexRowBetween}>
              <div>
                <h4 style={styles.pageTitle}>รายการพัสดุและวัตถุดิบในคลัง</h4>
                <span style={styles.pageSubtitle}>แสดงรายการพัสดุ สถานะคงเหลือ และตำแหน่งจัดเก็บ</span>
              </div>
              <button style={styles.btnExport} onClick={() => exportToCSV(products, 'inventory_report')}>ส่งออกข้อมูล CSV</button>
            </div>

            <div style={styles.filterSectionCard}>
              <div style={styles.categoryBar}>
                <span style={{ fontSize: 13, fontWeight: '600', color: '#334155', alignSelf: 'center', marginRight: 8 }}>หมวดหมู่พัสดุ:</span>
                {categoriesList.map(cat => (
                  <button
                    key={cat}
                    style={selectedCategory === cat ? styles.catPillActive : styles.catPill}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === 'all' ? 'ทั้งหมด' : cat}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  placeholder="ค้นหาตามชื่อพัสดุ, หมวดหมู่ หรือสถานที่จัดเก็บ..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={styles.searchInput}
                />
                <button 
                  onClick={() => setIsScannerOpen(true)}
                  style={{ ...styles.btnPrimary, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  📷 สแกน QR Code
                </button>
              </div>
            </div>

            {/* Product Cards Grid */}
            <div style={styles.grid}>
              {filteredProducts.map(product => (
                <div key={product.id} style={styles.productCard}>
                  <img src={product.image_url || 'https://via.placeholder.com/150'} alt={product.name} style={styles.prodImg} />
                  <div style={{ padding: '12px 10px', textAlign: 'left', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h5 style={{ margin: '0 0 6px 0', fontSize: 14, color: '#0f172a', fontWeight: '600' }}>{product.name}</h5>
                    <div style={styles.cardDetailText}>หมวดหมู่: {product.category || 'ทั่วไป'}</div>
                    <div style={styles.cardDetailText}>ตำแหน่งเก็บ: {product.location || 'ไม่ระบุ'}</div>
                    
                    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#475569' }}>ราคาต่อหน่วย:</span>
                        <span style={{ fontSize: 13, fontWeight: '600' }}>{product.price || 0} บาท</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: 4 }}>
                        <span style={{ fontSize: 12, color: '#475569' }}>คงเหลือ:</span>
                        <span style={{ color: product.quantity <= (product.min_quantity || 5) ? '#dc2626' : '#16a34a', fontWeight: 'bold', fontSize: 13 }}>
                          {product.quantity} หน่วย
                        </span>
                      </div>

                      <button 
                        style={styles.btnCardAction} 
                        onClick={() => openProductDetail(product)}
                      >
                        รายละเอียด / เบิกพัสดุ
                      </button>
                      {(currentUser.role === 'Restocker' || isAdminLevel) && (
                        <button 
                          style={{ ...styles.btnCardAction, backgroundColor: '#334155', marginTop: 6 }} 
                          onClick={() => handlePrintSticker(product)}
                        >
                          🖨️ พิมพ์สติกเกอร์
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Withdraw Requests View */}
        {activeTab === 'withdraw_requests' && (
          <div>
            <div style={{ marginBottom: 15 }}>
              <h4 style={styles.pageTitle}>รายการอนุมัติเบิกพัสดุ</h4>
              <span style={styles.pageSubtitle}>ตรวจสอบและอนุมัติรายการขอเบิกพัสดุภายในองค์กร</span>
            </div>
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>วันที่-เวลา ทำรายการ</th>
                    <th>ผู้ขอเบิก</th>
                    <th>รายการพัสดุ</th>
                    <th>จำนวน</th>
                    <th>วัตถุประสงค์การใช้งาน</th>
                    <th>สถานะการอนุมัติ</th>
                    {isAdminLevel && <th style={{ textAlign: 'center' }}>การดำเนินการ</th>}
                  </tr>
                </thead>
                <tbody>
                  {withdrawRequests.map(req => (
                    <tr key={req.id}>
                      <td>{new Date(req.created_at).toLocaleString('th-TH')}</td>
                      <td><b>{req.requested_by}</b></td>
                      <td>{req.product_name}</td>
                      <td><b>{req.quantity}</b> หน่วย</td>
                      <td>{req.note || '-'}</td>
                      <td>
                        {isPendingStatus(req.status) && <span style={styles.statusPending}>รอการพิจารณา</span>}
                        {isApprovedStatus(req.status) && <span style={styles.statusApproved}>อนุมัติเรียบร้อย</span>}
                        {isRejectedStatus(req.status) && <span style={styles.statusRejected}>ไม่อนุมัติ</span>}
                      </td>
                      {isAdminLevel && (
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {isPendingStatus(req.status) ? (
                              <>
                                <button style={styles.btnSuccessSmall} onClick={() => handleApproveWithdrawRequest(req)}>อนุมัติ</button>
                                <button style={styles.btnDangerSmall} onClick={() => handleRejectWithdrawRequest(req.id)}>ปฏิเสธ</button>
                              </>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: 12 }}>เสร็จสิ้น</span>
                            )}
                            {isSuperAdmin && (
                              <button style={styles.btnDangerSmall} onClick={() => handleSoftDeleteWithdrawRequest(req.id)}>ลบ</button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Product View */}
        {activeTab === 'add' && isAdminLevel && (
          <div style={styles.cardLarge}>
            <h4 style={styles.pageTitle}>ลงทะเบียนเพิ่มพัสดุใหม่</h4>
            <span style={styles.pageSubtitle}>กรอกข้อมูลรายละเอียดพัสดุเพื่อบันทึกเข้าสู่ระบบสารสนเทศคลัง</span>
            <hr style={styles.hr} />
            
            <form onSubmit={handleAddProduct} style={styles.formGrid}>
              <div>
                <label style={styles.label}>ชื่อรายการพัสดุ:</label>
                <input style={styles.input} type="text" value={prodName} onChange={e => setProdName(e.target.value)} required />
              </div>
              <div>
                <label style={styles.label}>หมวดหมู่พัสดุ:</label>
                <input style={styles.input} type="text" value={prodCat} onChange={e => setProdCat(e.target.value)} required placeholder="เช่น อุปกรณ์สำนักงาน, เครื่องมือช่าง" />
              </div>
              <div>
                <label style={styles.label}>จำนวนเริ่มต้น (หน่วย):</label>
                <input style={styles.input} type="number" value={prodQty} onChange={e => setProdQty(e.target.value)} required />
              </div>
              <div>
                <label style={styles.label}>จุดสั่งซื้อเติมพัสดุ (Min Stock):</label>
                <input style={styles.input} type="number" value={prodMinQty} onChange={e => setProdMinQty(e.target.value)} required />
              </div>
              <div>
                <label style={styles.label}>ราคาประเมินต่อหน่วย (บาท):</label>
                <input style={styles.input} type="number" value={prodPrice} onChange={e => setProdPrice(e.target.value)} required />
              </div>
              <div>
                <label style={styles.label}>สถานที่จัดเก็บ (Location/Shelf):</label>
                <input style={styles.input} type="text" value={prodLoc} onChange={e => setProdLoc(e.target.value)} placeholder="เช่น ตู้ A1, ชั้น 2" />
              </div>
              <div>
                <label style={styles.label}>เบอร์โทรศัพท์ร้านค้า/ผู้จัดจำหน่าย:</label>
                <input style={styles.input} type="text" value={prodStorePhone} onChange={e => setProdStorePhone(e.target.value)} placeholder="02-XXX-XXXX" />
              </div>
              <div>
                <label style={styles.label}>เว็บไซต์ผู้จัดจำหน่าย (URL):</label>
                <input style={styles.input} type="text" value={prodPurchaseUrl} onChange={e => setProdPurchaseUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={styles.label}>ที่อยู่ผู้จัดจำหน่าย (สาขาหลัก):</label>
                <input style={styles.input} type="text" value={prodStoreAddress1} onChange={e => setProdStoreAddress1(e.target.value)} placeholder="ที่อยู่บริษัท/คู่ค้า..." />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={styles.label}>ที่อยู่ผู้จัดจำหน่าย (สาขาสำรอง 1):</label>
                <input style={styles.input} type="text" value={prodStoreAddress2} onChange={e => setProdStoreAddress2(e.target.value)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={styles.label}>ที่อยู่ผู้จัดจำหน่าย (สาขาสำรอง 2):</label>
                <input style={styles.input} type="text" value={prodStoreAddress3} onChange={e => setProdStoreAddress3(e.target.value)} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={styles.label}>ลิงก์รูปภาพประกอบพัสดุ (URL Image):</label>
                <input style={styles.input} type="text" value={prodImg} onChange={e => setProdImg(e.target.value)} placeholder="https://..." />
              </div>
              <button style={{ ...styles.btnSuccess, gridColumn: '1 / -1', marginTop: 10 }} type="submit">บันทึกข้อมูลพัสดุ</button>
            </form>
          </div>
        )}

        {/* Users Management View */}
        {activeTab === 'users' && isAdminLevel && (
          <div>
            <div style={{ marginBottom: 15 }}>
              <h4 style={styles.pageTitle}>จัดการสิทธิ์ผู้ใช้งานในระบบ</h4>
              <span style={styles.pageSubtitle}>ตรวจสอบ อนุมัติสิทธิ์ และการจัดการบัญชีบุคลากร</span>
            </div>
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>รหัสประจำตัวพนักงาน</th>
                    <th>สิทธิ์การใช้งาน (Role)</th>
                    <th>สถานะบัญชี</th>
                    <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td><b>{u.emp_id}</b></td>
                      <td>
                        {isSuperAdmin ? (
                          <select 
                            style={{ ...styles.input, padding: '4px 8px', fontSize: 12 }} 
                            value={u.role} 
                            onChange={e => handleChangeUserRole(u, e.target.value)}
                          >
                            <option value="Employee">Employee</option>
                            <option value="Restocker">Restocker</option>
                            <option value="Admin">Admin</option>
                            <option value="Super Admin">Super Admin</option>
                          </select>
                        ) : (
                          u.role
                        )}
                      </td>
                      <td>
                        {u.status === 'approved' ? (
                          <span style={styles.statusApproved}>อนุมัติแล้ว</span>
                        ) : (
                          <span style={styles.statusPending}>รอการอนุมัติ</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {u.status !== 'approved' && (
                            <button style={styles.btnSuccessSmall} onClick={() => handleApproveUser(u.id)}>
                              อนุมัติสิทธิ์
                            </button>
                          )}
                          <button style={styles.btnWarningSmall} onClick={() => handleChangeUserPassword(u)}>
                            แก้ไขรหัสผ่าน
                          </button>
                          <button style={styles.btnDangerSmall} onClick={() => handleDeleteUser(u)}>
                            ลบบัญชี
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings — Super Admin เท่านั้น */}
        {activeTab === 'settings' && isSuperAdmin && (
          <SettingsPanel siteSettings={siteSettings} onSave={handleSaveSettings} />
        )}

        {/* Inbox Reports System */}
        {activeTab === 'reports' && (
          <div>
            <div style={styles.cardLarge}>
              <h4 style={styles.pageTitle}>ศูนย์รับแจ้งปัญหาและข้อผิดพลาดเกี่ยวกับพัสดุ</h4>
              <span style={styles.pageSubtitle}>ส่งข้อความแจ้งเตือนปัญหาสินค้าชำรุด หรือข้อมูลสต็อกไม่ถูกต้อง</span>
              <hr style={styles.hr} />

              <form onSubmit={handleCreateReport} style={styles.form}>
                <label style={styles.label}>เรื่องที่ต้องการแจ้ง:</label>
                <input style={styles.input} type="text" placeholder="ระบุหัวข้อคำร้อง..." value={repTitle} onChange={e => setRepTitle(e.target.value)} required />
                
                <label style={styles.label}>รายการพัสดุที่เกี่ยวข้อง (ถ้ามี):</label>
                <input style={styles.input} type="text" placeholder="ระบุชื่อพัสดุ..." value={repProdName} onChange={e => setRepProdName(e.target.value)} />
                
                <label style={styles.label}>รายละเอียดปัญหา / ข้อเสนอแนะ:</label>
                <textarea style={{ ...styles.input, height: 80 }} placeholder="พิมพ์รายละเอียดข้อมูลเพิ่มเติม..." value={repDesc} onChange={e => setRepDesc(e.target.value)} required />
                
                <button style={{ ...styles.btnPrimary, alignSelf: 'flex-start', marginTop: 5 }} type="submit">ส่งคำร้องแจ้งปัญหา</button>
              </form>
            </div>

            <div style={{ marginTop: 25 }}>
              <div style={styles.flexRowBetween}>
                <h4 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>กล่องข้อความแจ้งเตือนและรายการตอบกลับ</h4>
                <small style={{ color: '#64748b' }}>รวมข้อความทั้งสิ้น {reports.length} รายการ</small>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 15 }}>
                {reports.length > 0 ? (
                  reports.map(rep => {
                    const isResolved = rep.status === 'resolved';
                    return (
                      <div key={rep.id} style={{ ...styles.inboxCard, borderLeft: isResolved ? '4px solid #16a34a' : '4px solid #d97706' }}>
                        <div style={styles.inboxHeader}>
                          <div>
                            <span style={styles.inboxSender}>ผู้ส่งเรื่อง: <b>{rep.reported_by}</b></span>
                            <span style={styles.inboxDate}>• {new Date(rep.created_at).toLocaleString('th-TH')}</span>
                            {rep.product_name && <span style={styles.inboxTag}>พัสดุ: {rep.product_name}</span>}
                          </div>
                          <div>
                            {isResolved ? (
                              <span style={styles.statusApproved}>ดำเนินการแล้ว</span>
                            ) : (
                              <span style={styles.statusPending}>รอการดำเนินการ</span>
                            )}
                            {isSuperAdmin && (
                              <button 
                                style={{ ...styles.btnDangerSmall, marginLeft: 8 }} 
                                onClick={() => handleSoftDeleteReport(rep.id)}
                              >
                                ลบ
                              </button>
                            )}
                          </div>
                        </div>

                        <h5 style={{ margin: '10px 0 4px 0', fontSize: 14, color: '#0f172a' }}>หัวข้อ: {rep.title}</h5>
                        <p style={styles.inboxBody}>{rep.description}</p>

                        {rep.reply && (
                          <div style={styles.replyBox}>
                            <div style={{ fontWeight: 'bold', color: '#15803d', marginBottom: 4, fontSize: 12 }}>
                              การตอบกลับจากฝ่ายบริหารจัดการ:
                            </div>
                            <div style={{ fontSize: 13, color: '#1e293b' }}>{rep.reply}</div>
                          </div>
                        )}

                        {isAdminLevel && (
                          <div style={{ marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input 
                                type="text" 
                                style={{ ...styles.input, fontSize: 13 }} 
                                placeholder="พิมพ์ข้อความตอบกลับเพื่อแจ้งผู้ส่งเรื่อง..."
                                value={replyTextMap[rep.id] || ''}
                                onChange={e => setReplyTextMap({ ...replyTextMap, [rep.id]: e.target.value })}
                              />
                              <button 
                                style={{ ...styles.btnSuccess, whiteSpace: 'nowrap' }}
                                onClick={() => handleSendReply(rep.id)}
                              >
                                บันทึกการตอบกลับ
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 30, backgroundColor: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                    ไม่มีรายการข้อความแจ้งเตือนในระบบ
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transactions & Analytics View */}
        {activeTab === 'history' && (
          <div>
            <div style={styles.flexRowBetween}>
              <div>
                <h4 style={styles.pageTitle}>รายงานประวัติการเบิกและสถิติพัสดุ</h4>
                <span style={styles.pageSubtitle}>สรุปข้อมูลสถิติ วิเคราะห์การเบิกพัสดุตามช่วงเวลา</span>
              </div>
              <button style={styles.btnExport} onClick={() => exportToCSV(filteredWithdrawals, 'withdraw_analytics_report')}>ส่งออกข้อมูล CSV</button>
            </div>

            <div style={styles.filterBox}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <label style={styles.label}>เลือกช่วงเวลา:</label>
                  <select 
                    style={styles.input} 
                    value={historyFilterType} 
                    onChange={e => setHistoryFilterType(e.target.value)}
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="day">รายวัน</option>
                    <option value="month">รายเดือน</option>
                    <option value="year">รายปี</option>
                  </select>
                </div>

                {historyFilterType === 'day' && (
                  <div>
                    <label style={styles.label}>ระบุวันที่:</label>
                    <input style={styles.input} type="date" value={historyFilterDate} onChange={e => setHistoryFilterDate(e.target.value)} />
                  </div>
                )}

                {historyFilterType === 'month' && (
                  <div>
                    <label style={styles.label}>ระบุเดือน/ปี:</label>
                    <input style={styles.input} type="month" value={historyFilterMonth} onChange={e => setHistoryFilterMonth(e.target.value)} />
                  </div>
                )}

                {historyFilterType === 'year' && (
                  <div>
                    <label style={styles.label}>ระบุปี (ค.ศ.):</label>
                    <input style={styles.input} type="number" placeholder="2026" value={historyFilterYear} onChange={e => setHistoryFilterYear(e.target.value)} />
                  </div>
                )}

                <div>
                  <label style={styles.label}>ค้นหาบุคลากร:</label>
                  <input style={styles.input} type="text" placeholder="รหัสพนักงาน..." value={historySearchUser} onChange={e => setHistorySearchUser(e.target.value)} />
                </div>

                <div>
                  <label style={styles.label}>ค้นหารายการพัสดุ:</label>
                  <input style={styles.input} type="text" placeholder="ชื่อพัสดุ..." value={historySearchProduct} onChange={e => setHistorySearchProduct(e.target.value)} />
                </div>
              </div>
            </div>

            <div style={styles.analyticsGrid}>
              <div style={styles.statCard}>
                <small style={{ color: '#64748b', fontWeight: '600' }}>ผู้ขอเบิกพัสดุสูงสุด</small>
                <h3 style={{ margin: '6px 0', color: '#0f172a', fontSize: 20 }}>
                  {analytics.topUser ? analytics.topUser.user : 'ไม่มีข้อมูล'}
                </h3>
                <small style={{ color: '#2563eb', fontWeight: '600' }}>
                  {analytics.topUser ? `เบิกรวม ${analytics.topUser.totalQty.toLocaleString()} หน่วย (${analytics.topUser.times} ครั้ง)` : '-'}
                </small>
              </div>

              <div style={styles.statCard}>
                <small style={{ color: '#64748b', fontWeight: '600' }}>พัสดุที่มีอัตราการเบิกสูงสุด</small>
                <h3 style={{ margin: '6px 0', color: '#0f172a', fontSize: 20 }}>
                  {analytics.topProduct ? analytics.topProduct.name : 'ไม่มีข้อมูล'}
                </h3>
                <small style={{ color: '#16a34a', fontWeight: '600' }}>
                  {analytics.topProduct ? `ถูกเบิกรวม ${analytics.topProduct.totalQty.toLocaleString()} หน่วย (${analytics.topProduct.times} ครั้ง)` : '-'}
                </small>
              </div>

              <div style={styles.statCard}>
                <small style={{ color: '#64748b', fontWeight: '600' }}>ปริมาณการเบิกรวม</small>
                <h3 style={{ margin: '6px 0', color: '#0f172a', fontSize: 20 }}>
                  {analytics.totalQty.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 'normal' }}>หน่วย</span>
                </h3>
                <small style={{ color: '#475569' }}>จากทั้งหมด {filteredWithdrawals.length} รายการเบิก</small>
              </div>

              <div style={styles.statCard}>
                <small style={{ color: '#64748b', fontWeight: '600' }}>มูลค่าพัสดุที่เบิกใช้งานรวม</small>
                <h3 style={{ margin: '6px 0', color: '#d97706', fontSize: 20 }}>
                  {analytics.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span style={{ fontSize: 13, fontWeight: 'normal' }}>บาท</span>
                </h3>
                <small style={{ color: '#475569' }}>คำนวณตามราคาประเมินต่อหน่วย</small>
              </div>
            </div>

            <h5 style={{ marginTop: 25, marginBottom: 10, fontSize: 15, color: '#1e293b' }}>ประวัติรายการเบิกพัสดุแบบละเอียด</h5>
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>วันที่-เวลา อนุมัติ</th>
                    <th>ผู้ขอเบิก</th>
                    <th>รายการพัสดุ</th>
                    <th>จำนวน</th>
                    <th>ราคา/หน่วย</th>
                    <th>มูลค่ารวม (บาท)</th>
                    <th>บันทึกระบบ</th>
                    {isSuperAdmin && <th style={{ textAlign: 'center' }}>การดำเนินการ</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredWithdrawals.length > 0 ? (
                    filteredWithdrawals.map(w => (
                      <tr key={w.id}>
                        <td>{w.dateObj.toLocaleString('th-TH')}</td>
                        <td><b>{w.user}</b></td>
                        <td>{w.productName}</td>
                        <td><b style={{ color: '#2563eb' }}>{w.quantity}</b> หน่วย</td>
                        <td>{w.unitPrice.toLocaleString()} บาท</td>
                        <td><b>{w.totalPrice.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</b></td>
                        <td style={{ fontSize: 11, color: '#64748b' }}>{w.rawDetails}</td>
                        {isSuperAdmin && (
                          <td style={{ textAlign: 'center' }}>
                            <button style={styles.btnDangerSmall} onClick={() => handleSoftDeleteWithdrawRequest(w.id)}>ลบ</button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isSuperAdmin ? 8 : 7} style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                        ไม่พบข้อมูลประวัติการเบิกตามเงื่อนไขที่ระบุ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h5 style={{ marginTop: 25, marginBottom: 10, fontSize: 15, color: '#1e293b' }}>สรุปการเติมสต็อกตามผู้ทำรายการ</h5>
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>ผู้ทำรายการ</th>
                    <th>จำนวนครั้งที่เติม</th>
                    <th>จำนวนรวมที่เติม</th>
                  </tr>
                </thead>
                <tbody>
                  {restockLogs.length > 0 ? (
                    Object.values(
                      restockLogs.reduce((acc, log) => {
                        const key = log.added_by || 'ไม่ระบุ';
                        if (!acc[key]) acc[key] = { user: key, times: 0, totalQty: 0 };
                        acc[key].times += 1;
                        acc[key].totalQty += (log.quantity || 0);
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => b.totalQty - a.totalQty)
                      .map(row => (
                        <tr key={row.user}>
                          <td><b>{row.user}</b></td>
                          <td>{row.times} ครั้ง</td>
                          <td><b style={{ color: '#16a34a' }}>+{row.totalQty.toLocaleString()}</b> หน่วย</td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                        ยังไม่มีประวัติการเติมสต็อกในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h5 style={{ marginTop: 25, marginBottom: 10, fontSize: 15, color: '#1e293b' }}>ประวัติการเติมพัสดุเข้าคลัง (Stock-in) แบบละเอียด</h5>
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>วันที่-เวลา</th>
                    <th>รายการพัสดุ</th>
                    <th>จำนวนที่เติม</th>
                    <th>ผู้ทำรายการ</th>
                  </tr>
                </thead>
                <tbody>
                  {restockLogs.length > 0 ? (
                    restockLogs.map(log => (
                      <tr key={log.id}>
                        <td>{new Date(log.created_at).toLocaleString('th-TH')}</td>
                        <td>{log.product_name}</td>
                        <td><b style={{ color: '#16a34a' }}>+{log.quantity}</b> หน่วย</td>
                        <td>{log.added_by}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                        ยังไม่มีประวัติการเติมสต็อกในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <QRScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleScanSuccess} 
      />

      {/* AI Search Widget */}
      <div style={styles.aiWidget}>
        {!isAiOpen ? (
          <button style={styles.aiToggleButton} onClick={() => setIsAiOpen(true)}>
            <img src={AI_AVATAR_URL} alt="AI Search" style={{ width: 20, height: 20 }} />
            <span>ค้นหาด้วยระบบ AI</span>
          </button>
        ) : (
          <div style={styles.aiChatBox}>
            <div style={styles.aiHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={AI_AVATAR_URL} alt="AI Avatar" style={{ width: 18, height: 18 }} />
                <span style={{ fontWeight: '600', fontSize: 13 }}>ระบบช่วยค้นหาข้อมูลพัสดุ</span>
              </div>
              <button style={styles.aiCloseBtn} onClick={() => setIsAiOpen(false)}>✕</button>
            </div>
            
            <div style={styles.aiMessagesArea}>
              {aiMessages.map((msg, idx) => (
                <div key={idx} style={msg.sender === 'user' ? styles.msgUser : styles.msgAi}>
                  <div>{msg.text}</div>
                  
                  {msg.products && msg.products.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {msg.products.map(p => (
                        <div key={p.id} style={styles.aiProductCard}>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                            • คงเหลือ: <b style={{ color: p.quantity > (p.min_quantity || 5) ? '#16a34a' : '#dc2626' }}>{p.quantity} หน่วย</b><br />
                            • ราคา: <b>{p.price || 0} บาท</b> | ตำแหน่ง: {p.location || 'ไม่ระบุ'}
                          </div>
                          <button 
                            style={styles.aiViewBtn} 
                            onClick={() => openProductDetail(p)}
                          >
                            ดูรายละเอียด / เบิก
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={styles.quickPromptsContainer}>
              <button style={styles.quickPill} onClick={() => processAiQuery('มีของทั้งหมดกี่ชิ้น')}>จำนวนพัสดุทั้งหมด</button>
              <button style={styles.quickPill} onClick={() => processAiQuery('สินค้าใกล้หมดมีอะไรบ้าง')}>พัสดุระดับสต็อกต่ำ</button>
              <button style={styles.quickPill} onClick={() => processAiQuery('มูลค่ารวมของในคลังเท่าไหร่')}>สรุปมูลค่าคงคลัง</button>
              <button style={styles.quickPill} onClick={() => processAiQuery('ใครเบิกของเยอะสุด')}>ผู้เบิกสูงสุด</button>
              <button style={styles.quickPill} onClick={() => processAiQuery('ประวัติการเบิกของฉัน')}>ประวัติของฉัน</button>
              <button style={styles.quickPill} onClick={() => processAiQuery('หมวดหมู่ไหนมีพัสดุเยอะสุด')}>หมวดหมู่ยอดนิยม</button>
            </div>

            <form onSubmit={handleAiSend} style={styles.aiInputArea}>
              <input 
                style={styles.aiInput} 
                type="text" 
                placeholder="พิมพ์ชื่อพัสดุ หรือคำถาม..." 
                value={aiQuery} 
                onChange={e => setAiQuery(e.target.value)} 
              />
              <button style={styles.aiSendBtn} type="submit">ค้นหา</button>
            </form>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            {!isEditing ? (
              <>
                <h3 style={{ marginTop: 0, fontSize: 18, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
                  รายละเอียดพัสดุ: {selectedProduct.name}
                </h3>
                
                <div style={{ textAlign: 'center', margin: '10px 0' }}>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedProduct.qr_code || selectedProduct.name)}`} 
                    alt="Product QR Code" 
                    style={{ width: 130, height: 130, border: '1px solid #cbd5e1', padding: 4, borderRadius: 6 }}
                  />
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    รหัส QR: {selectedProduct.qr_code || selectedProduct.name}
                  </div>
                </div>

                <div style={{ textAlign: 'left', margin: '15px 0' }}>
                  <p style={styles.modalText}><b>หมวดหมู่:</b> {selectedProduct.category || 'ทั่วไป'}</p>
                  <p style={styles.modalText}><b>สถานที่จัดเก็บ:</b> {selectedProduct.location || 'ไม่ระบุ'}</p>
                  <p style={styles.modalText}><b>ราคาประเมินต่อหน่วย:</b> {selectedProduct.price || 0} บาท</p>
                  <p style={styles.modalText}><b>จำนวนคงเหลือปัจจุบัน:</b> <b style={{ color: '#16a34a' }}>{selectedProduct.quantity}</b> หน่วย</p>
                  
                  {selectedProduct.store_phone && (
                    <p style={styles.modalText}>
                      <b>เบอร์โทรศัพท์ผู้จัดจำหน่าย:</b> <a href={`tel:${selectedProduct.store_phone}`} style={{ color: '#2563eb' }}>{selectedProduct.store_phone}</a>
                    </p>
                  )}

                  {selectedProduct.store_address && (
                    <p style={styles.modalText}><b>ที่อยู่ผู้จัดจำหน่าย 1:</b> {selectedProduct.store_address}</p>
                  )}
                  {selectedProduct.store_address2 && (
                    <p style={styles.modalText}><b>ที่อยู่ผู้จัดจำหน่าย 2:</b> {selectedProduct.store_address2}</p>
                  )}
                  {selectedProduct.store_address3 && (
                    <p style={styles.modalText}><b>ที่อยู่ผู้จัดจำหน่าย 3:</b> {selectedProduct.store_address3}</p>
                  )}
                </div>

                <div style={{ margin: '15px 0', textAlign: 'left', backgroundColor: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <label style={styles.label}>ระบุจำนวนที่ต้องการเบิก/นำเข้า:</label>
                  <input 
                    style={{ ...styles.input, marginBottom: 10 }} 
                    type="number" 
                    min="1" 
                    value={actionQty} 
                    onChange={e => setActionQty(e.target.value)} 
                  />

                  {(currentUser.role === 'Employee' || isAdminLevel) && (
                    <>
                      <label style={styles.label}>วัตถุประสงค์การใช้งาน / หมายเหตุการเบิก (จำเป็น):</label>
                      <input 
                        style={styles.input} 
                        type="text" 
                        placeholder="ระบุวัตถุประสงค์การนำไปใช้งาน..."
                        value={withdrawNote}
                        onChange={e => setWithdrawNote(e.target.value)}
                      />
                    </>
                  )}
                </div>

                <div style={styles.flexRowGap}>
                  {(currentUser.role === 'Employee' || isAdminLevel) && (
                    <button style={styles.btnPrimary} onClick={() => handleRequestWithdraw(selectedProduct)}>
                      ส่งคำขออนุมัติเบิกพัสดุ
                    </button>
                  )}
                  {(currentUser.role === 'Restocker' || isAdminLevel) && (
                    <button style={styles.btnSuccess} onClick={() => handleRestock(selectedProduct, actionQty)}>
                      นำเข้าพัสดุเพิ่ม
                    </button>
                  )}
                  {(currentUser.role === 'Restocker' || isAdminLevel) && (
                    <button style={styles.btnPrint} onClick={() => handlePrintSticker(selectedProduct)}>
                      🖨️ พิมพ์สติกเกอร์
                    </button>
                  )}
                  {isAdminLevel && (
                    <button style={styles.btnWarning} onClick={() => setIsEditing(true)}>
                      แก้ไขข้อมูล
                    </button>
                  )}
                  {isAdminLevel && (
                    <button style={styles.btnDanger} onClick={() => handleDeleteProduct(selectedProduct.id)}>
                      ลบรายการ
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div>
                <h3 style={{ marginTop: 0, fontSize: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>แก้ไขข้อมูลพัสดุ</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginTop: 10 }}>
                  <label style={styles.label}>ชื่อรายการพัสดุ:</label>
                  <input style={styles.input} type="text" value={editData.name || ''} onChange={e => setEditData({ ...editData, name: e.target.value })} />
                  
                  <label style={styles.label}>หมวดหมู่:</label>
                  <input style={styles.input} type="text" value={editData.category || ''} onChange={e => setEditData({ ...editData, category: e.target.value })} />
                  
                  <label style={styles.label}>สถานที่จัดเก็บ:</label>
                  <input style={styles.input} type="text" value={editData.location || ''} onChange={e => setEditData({ ...editData, location: e.target.value })} />
                  
                  <label style={styles.label}>จำนวนคงเหลือ:</label>
                  <input 
                    style={styles.input} 
                    type="number" 
                    value={editData.quantity ?? ''} 
                    onChange={e => setEditData({ ...editData, quantity: e.target.value })} 
                  />
                  
                  <label style={styles.label}>ราคาต่อหน่วย:</label>
                  <input 
                    style={styles.input} 
                    type="number" 
                    value={editData.price ?? ''} 
                    onChange={e => setEditData({ ...editData, price: e.target.value })} 
                  />

                  <label style={styles.label}>เกณฑ์แจ้งเตือนสต็อกใกล้หมด:</label>
                  <input 
                    style={styles.input} 
                    type="number" 
                    value={editData.min_quantity ?? ''} 
                    onChange={e => setEditData({ ...editData, min_quantity: e.target.value })} 
                  />

                  <label style={styles.label}>URL รูปภาพพัสดุ:</label>
                  <input 
                    style={styles.input} 
                    type="text" 
                    placeholder="https://..." 
                    value={editData.image_url || ''} 
                    onChange={e => setEditData({ ...editData, image_url: e.target.value })} 
                  />
                  {editData.image_url && (
                    <img 
                      src={editData.image_url} 
                      alt="ตัวอย่างรูปภาพ" 
                      style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6, marginTop: 6, border: '1px solid #cbd5e1' }} 
                      onError={e => { e.target.style.display = 'none'; }}
                      onLoad={e => { e.target.style.display = 'block'; }}
                    />
                  )}

                  <label style={styles.label}>ที่อยู่ผู้จัดจำหน่าย 1:</label>
                  <input style={styles.input} type="text" value={editData.store_address || ''} onChange={e => setEditData({ ...editData, store_address: e.target.value })} />

                  <label style={styles.label}>ที่อยู่ผู้จัดจำหน่าย 2:</label>
                  <input style={styles.input} type="text" value={editData.store_address2 || ''} onChange={e => setEditData({ ...editData, store_address2: e.target.value })} />

                  <label style={styles.label}>ที่อยู่ผู้จัดจำหน่าย 3:</label>
                  <input style={styles.input} type="text" value={editData.store_address3 || ''} onChange={e => setEditData({ ...editData, store_address3: e.target.value })} />
                </div>
                
                <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                  <button style={styles.btnSuccess} onClick={handleSaveEditProduct}>บันทึกการแก้ไข</button>
                  <button style={styles.btnCloseModal} onClick={() => setIsEditing(false)}>ยกเลิก</button>
                </div>
              </div>
            )}

            <button style={{ ...styles.btnCloseModal, marginTop: 15 }} onClick={() => setSelectedProduct(null)}>ปิดหน้าต่าง</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Style Sheet
const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', padding: 15 },
  card: { backgroundColor: '#fff', padding: 30, borderRadius: 8, boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)', width: '100%', maxWidth: 400, boxSizing: 'border-box', border: '1px solid #e2e8f0' },
  loginHeader: { textAlign: 'center', marginBottom: 25 },
  cardLarge: { backgroundColor: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' },
  pageTitle: { margin: 0, fontSize: 18, color: '#0f172a', fontWeight: '700' },
  pageSubtitle: { fontSize: 12, color: '#64748b', display: 'block', marginTop: 3 },
  hr: { border: 'none', borderTop: '1px solid #e2e8f0', margin: '15px 0' },
  title: { textAlign: 'center', margin: '0 0 5px 0', color: '#0f172a', fontSize: 18, fontWeight: '700' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 4 },
  input: { padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, width: '100%', boxSizing: 'border-box', outline: 'none' },
  btnPrimary: { backgroundColor: '#1e3a8a', color: '#fff', padding: '9px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: '600', fontSize: 13 },
  btnSuccess: { backgroundColor: '#15803d', color: '#fff', padding: '9px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: '600', fontSize: 13 },
  btnWarning: { backgroundColor: '#b45309', color: '#fff', padding: '9px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: '600', fontSize: 13 },
  btnDanger: { backgroundColor: '#b91c1c', color: '#fff', padding: '9px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: '600', fontSize: 13 },
  btnCardAction: { backgroundColor: '#1e293b', color: '#fff', padding: '7px 0', border: 'none', borderRadius: 4, cursor: 'pointer', width: '100%', marginTop: 8, fontSize: 12, fontWeight: '600' },
  btnDangerSmall: { backgroundColor: '#b91c1c', color: '#fff', padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  btnSuccessSmall: { backgroundColor: '#15803d', color: '#fff', padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  btnWarningSmall: { backgroundColor: '#b45309', color: '#fff', padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  btnExport: { backgroundColor: '#0f766e', color: '#fff', padding: '7px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: '600' },
  btnPrint: { backgroundColor: '#334155', color: '#fff', padding: '9px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: '600', fontSize: 13 },
  btnLogout: { backgroundColor: '#334155', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  linkText: { textAlign: 'center', marginTop: 15, color: '#1d4ed8', cursor: 'pointer', fontSize: 12 },
  appWrapper: { fontFamily: 'Sarabun, Segoe UI, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: 80, color: '#334155' },
  header: { backgroundColor: '#0f172a', color: '#fff', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid #1e293b' },
  logoBadge: { backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', fontSize: 11, padding: '4px 8px', borderRadius: 4, letterSpacing: '1px' },
  navBar: { backgroundColor: '#1e293b', padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto', whiteSpace: 'nowrap', borderBottom: '1px solid #334155' },
  navBtn: { backgroundColor: 'transparent', border: 'none', color: '#94a3b8', padding: '12px 16px', cursor: 'pointer', fontSize: 13, fontWeight: '500' },
  navActive: { backgroundColor: '#334155', color: '#fff', border: 'none', padding: '12px 16px', cursor: 'pointer', fontSize: 13, fontWeight: '600', borderBottom: '2px solid #3b82f6' },
  badge: { backgroundColor: '#ef4444', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 8, marginLeft: 4 },
  content: { padding: 24, maxWidth: 1280, margin: '0 auto' },
  filterSectionCard: { backgroundColor: '#fff', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 15, marginBottom: 15 },
  categoryBar: { display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 0', whiteSpace: 'nowrap' },
  catPill: { backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: '500' },
  catPillActive: { backgroundColor: '#1e293b', color: '#ffffff', border: '1px solid #1e293b', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: '600' },
  searchInput: { width: '100%', padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 15 },
  productCard: { backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s' },
  prodImg: { width: '100%', height: 130, objectFit: 'cover', borderBottom: '1px solid #f1f5f9' },
  cardDetailText: { fontSize: 12, margin: '2px 0', color: '#64748b' },
  tableCard: { backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' },
  flexRowBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  flexRowGap: { display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  statusPending: { backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 4, fontWeight: '600', fontSize: 11 },
  statusApproved: { backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 4, fontWeight: '600', fontSize: 11 },
  statusRejected: { backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 4, fontWeight: '600', fontSize: 11 },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: 15 },
  modalCard: { backgroundColor: '#fff', padding: 24, borderRadius: 8, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box', border: '1px solid #e2e8f0' },
  modalText: { fontSize: 13, margin: '6px 0', color: '#334155' },
  btnCloseModal: { backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  inboxCard: { backgroundColor: '#fff', padding: 16, borderRadius: 6, border: '1px solid #e2e8f0' },
  inboxHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: 12 },
  inboxSender: { color: '#0f172a' },
  inboxDate: { color: '#64748b', marginLeft: 6 },
  inboxTag: { backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#475569', marginLeft: 8, fontSize: 11 },
  inboxBody: { fontSize: 13, color: '#334155', margin: '8px 0', lineHeight: 1.5 },
  replyBox: { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: 10, borderRadius: 6, marginTop: 10 },
  filterBox: { backgroundColor: '#fff', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 15 },
  analyticsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 15 },
  statCard: { backgroundColor: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', borderLeft: '4px solid #1e3a8a' },
  aiWidget: { position: 'fixed', bottom: 20, right: 20, zIndex: 99 },
  aiToggleButton: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#0f172a', color: '#fff', padding: '10px 18px', borderRadius: 30, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: '600', fontSize: 13 },
  aiChatBox: { width: 'calc(100vw - 40px)', maxWidth: 350, height: 450, backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #cbd5e1' },
  aiHeader: { backgroundColor: '#0f172a', color: '#fff', padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  aiCloseBtn: { backgroundColor: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14 },
  aiMessagesArea: { flex: 1, padding: 12, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, backgroundColor: '#f8fafc', whiteSpace: 'pre-line' },
  msgUser: { alignSelf: 'flex-end', backgroundColor: '#1e3a8a', color: '#fff', padding: '8px 12px', borderRadius: '8px 8px 0 8px', fontSize: 12, maxWidth: '85%' },
  msgAi: { alignSelf: 'flex-start', backgroundColor: '#e2e8f0', color: '#0f172a', padding: '8px 12px', borderRadius: '8px 8px 8px 0', fontSize: 12, maxWidth: '85%' },
  aiProductCard: { backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 8, marginTop: 4 },
  aiViewBtn: { width: '100%', backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '5px 8px', borderRadius: 4, cursor: 'pointer', marginTop: 6, fontSize: 11, fontWeight: '600' },
  quickPromptsContainer: { display: 'flex', gap: 6, padding: '6px 10px', backgroundColor: '#f1f5f9', overflowX: 'auto', borderTop: '1px solid #e2e8f0' },
  quickPill: { backgroundColor: '#fff', border: '1px solid #cbd5e1', color: '#334155', padding: '4px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' },
  aiInputArea: { display: 'flex', padding: 8, borderTop: '1px solid #e2e8f0' },
  aiInput: { flex: 1, padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12 },
  aiSendBtn: { marginLeft: 6, backgroundColor: '#1e3a8a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: '600' }
};