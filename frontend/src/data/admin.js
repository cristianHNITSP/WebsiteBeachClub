export const BOOKINGS_DATA = [
  { id: 'BK001', guest: 'Ana Martínez', room: 'Suite Coral Grande', checkIn: '2026-04-01', checkOut: '2026-04-05', status: 'confirmed', amount: 12800 },
  { id: 'BK002', guest: 'Carlos Rodríguez', room: 'Cabaña del Manglar', checkIn: '2026-04-02', checkOut: '2026-04-04', status: 'confirmed', amount: 4200 },
  { id: 'BK003', guest: 'Sofia Hernández', room: 'Suite Horizonte Azul', checkIn: '2026-04-03', checkOut: '2026-04-07', status: 'pending', amount: 19200 },
  { id: 'BK004', guest: 'Miguel Torres', room: 'Habitación Familiar Arena', checkIn: '2026-04-05', checkOut: '2026-04-08', status: 'confirmed', amount: 7800 },
  { id: 'BK005', guest: 'Laura Jiménez', room: 'Villa Chuburná Sunset', checkIn: '2026-04-06', checkOut: '2026-04-10', status: 'confirmed', amount: 15600 },
  { id: 'BK006', guest: 'Roberto Sánchez', room: 'Estudio Frida Clásico', checkIn: '2026-04-08', checkOut: '2026-04-09', status: 'cancelled', amount: 1450 },
  { id: 'BK007', guest: 'Elena Castro', room: 'Suite Coral Grande', checkIn: '2026-04-10', checkOut: '2026-04-14', status: 'confirmed', amount: 12800 },
  { id: 'BK008', guest: 'Fernando Díaz', room: 'Cabaña del Manglar', checkIn: '2026-04-11', checkOut: '2026-04-13', status: 'pending', amount: 4200 },
  { id: 'BK009', guest: 'Patricia López', room: 'Suite Horizonte Azul', checkIn: '2026-04-12', checkOut: '2026-04-15', status: 'confirmed', amount: 14400 },
  { id: 'BK010', guest: 'Andrés Morales', room: 'Habitación Familiar Arena', checkIn: '2026-04-15', checkOut: '2026-04-20', status: 'confirmed', amount: 13000 },
]

export const ROOMS_DATA = [
  { id:  1, name: 'Suite Coral Grande',         type: 'Suite',         status: 'active',      rate: 3200, img: 'https://placehold.co/600x400/003b41/006971?text=Suite+Coral+Grande' },
  { id:  2, name: 'Cabaña del Manglar',          type: 'Cabaña',        status: 'active',      rate: 2100, img: 'https://placehold.co/600x400/1a4a2e/2d7a4f?text=Cabaña+del+Manglar' },
  { id:  3, name: 'Suite Horizonte Azul',        type: 'Suite Premium', status: 'maintenance', rate: 4800, img: 'https://placehold.co/600x400/003b41/006971?text=Suite+Horizonte+Azul' },
  { id:  4, name: 'Villa Chuburná Sunset',       type: 'Villa',         status: 'active',      rate: 3900, img: 'https://placehold.co/600x400/5c3200/a05a00?text=Villa+Chuburná+Sunset' },
  { id:  5, name: 'Cabaña Brisa Marina',         type: 'Cabaña',        status: 'active',      rate: 2400, img: 'https://placehold.co/600x400/1a4a2e/2d7a4f?text=Cabaña+Brisa+Marina' },
  { id:  6, name: 'Suite Frida Clásica',         type: 'Suite',         status: 'active',      rate: 2900, img: 'https://placehold.co/600x400/4a0030/8a005a?text=Suite+Frida+Clásica' },
  { id:  7, name: 'Estudio Palapa Norte',        type: 'Estudio',       status: 'active',      rate: 1600, img: 'https://placehold.co/600x400/003b41/006971?text=Estudio+Palapa+Norte' },
  { id:  8, name: 'Villa Flamingo Rosado',       type: 'Villa',         status: 'active',      rate: 4200, img: 'https://placehold.co/600x400/5c1a3a/a02060?text=Villa+Flamingo+Rosado' },
  { id:  9, name: 'Habitación Familiar Arena',   type: 'Familiar',      status: 'active',      rate: 2600, img: 'https://placehold.co/600x400/5c4a00/a08800?text=Hab.+Familiar+Arena' },
  { id: 10, name: 'Suite Cenote Esmeralda',      type: 'Suite Premium', status: 'maintenance', rate: 5200, img: 'https://placehold.co/600x400/003b2e/006b52?text=Suite+Cenote+Esmeralda' },
  { id: 11, name: 'Cabaña Selva Profunda',       type: 'Cabaña',        status: 'active',      rate: 1900, img: 'https://placehold.co/600x400/1a4a2e/2d7a4f?text=Cabaña+Selva+Profunda' },
  { id: 12, name: 'Estudio Frida Clásico',       type: 'Estudio',       status: 'active',      rate: 1450, img: 'https://placehold.co/600x400/4a0030/8a005a?text=Estudio+Frida+Clásico' },
]

export const USERS_DATA = [
  { id:  1, name: 'Valeria Montoya',    email: 'valeria@hotelesfrida.mx',    role: 'Curator',  lastActive: 'Hace 2 min',    avatar: 'https://placehold.co/56x56/7e469a/ffffff?text=VM' },
  { id:  2, name: 'Diego Fuentes',      email: 'diego@hotelesfrida.mx',      role: 'Artisan',  lastActive: 'Hace 1 hora',   avatar: 'https://placehold.co/56x56/003b41/ffffff?text=DF' },
  { id:  3, name: 'Isabella Reyes',     email: 'isabella@hotelesfrida.mx',   role: 'Steward',  lastActive: 'Hace 3 horas',  avatar: 'https://placehold.co/56x56/735c00/ffffff?text=IR' },
  { id:  4, name: 'Marco Silva',        email: 'marco@hotelesfrida.mx',      role: 'Artisan',  lastActive: 'Ayer',          avatar: 'https://placehold.co/56x56/003b41/ffffff?text=MS' },
  { id:  5, name: 'Sofía Castellanos',  email: 'sofia@hotelesfrida.mx',      role: 'Curator',  lastActive: 'Hace 5 min',    avatar: 'https://placehold.co/56x56/7e469a/ffffff?text=SC' },
  { id:  6, name: 'Rodrigo Alvarado',   email: 'rodrigo@hotelesfrida.mx',    role: 'Steward',  lastActive: 'Hace 2 horas',  avatar: 'https://placehold.co/56x56/735c00/ffffff?text=RA' },
  { id:  7, name: 'Camila Torres',      email: 'camila@hotelesfrida.mx',     role: 'Artisan',  lastActive: 'Hace 4 horas',  avatar: 'https://placehold.co/56x56/003b41/ffffff?text=CT' },
  { id:  8, name: 'Andrés Peñaloza',    email: 'andres@hotelesfrida.mx',     role: 'Curator',  lastActive: 'Hace 30 min',   avatar: 'https://placehold.co/56x56/7e469a/ffffff?text=AP' },
  { id:  9, name: 'Lucía Mendoza',      email: 'lucia@hotelesfrida.mx',      role: 'Steward',  lastActive: 'Hace 6 horas',  avatar: 'https://placehold.co/56x56/735c00/ffffff?text=LM' },
  { id: 10, name: 'Javier Ríos',        email: 'javier@hotelesfrida.mx',     role: 'Artisan',  lastActive: 'Ayer',          avatar: 'https://placehold.co/56x56/003b41/ffffff?text=JR' },
  { id: 11, name: 'Natalia Guerrero',   email: 'natalia@hotelesfrida.mx',    role: 'Curator',  lastActive: 'Hace 15 min',   avatar: 'https://placehold.co/56x56/7e469a/ffffff?text=NG' },
  { id: 12, name: 'Tomás Ibáñez',       email: 'tomas@hotelesfrida.mx',      role: 'Artisan',  lastActive: 'Hace 2 días',   avatar: 'https://placehold.co/56x56/003b41/ffffff?text=TI' },
  { id: 13, name: 'Fernanda Ortega',    email: 'fernanda@hotelesfrida.mx',   role: 'Steward',  lastActive: 'Hace 1 día',    avatar: 'https://placehold.co/56x56/735c00/ffffff?text=FO' },
]

export const CALENDAR_DATA = [
  {
    roomId: 1,
    roomName: 'Suite Coral Grande',
    roomType: 'Suite',
    bookings: [
      { guestName: 'Ana Martínez', startDay: 0, span: 3, type: 'primary', avatar: 'https://placehold.co/44x44/003b41/ffffff?text=AM' },
      { guestName: 'Elena Castro', startDay: 5, span: 2, type: 'secondary', avatar: 'https://placehold.co/44x44/7e469a/ffffff?text=EC' },
    ]
  },
  {
    roomId: 2,
    roomName: 'Cabaña del Manglar',
    roomType: 'Cabaña',
    bookings: [
      { guestName: 'Carlos R.', startDay: 1, span: 2, type: 'secondary', avatar: 'https://placehold.co/44x44/7e469a/ffffff?text=CR' },
      { guestName: 'MANTENIMIENTO', startDay: 4, span: 1, type: 'blocked', avatar: null },
    ]
  },
  {
    roomId: 3,
    roomName: 'Suite Horizonte Azul',
    roomType: 'Suite Premium',
    bookings: [
      { guestName: 'Sofia H.', startDay: 2, span: 4, type: 'primary', avatar: 'https://placehold.co/44x44/003b41/ffffff?text=SH' },
    ]
  },
  {
    roomId: 4,
    roomName: 'Villa Chuburná Sunset',
    roomType: 'Villa',
    bookings: [
      { guestName: 'Laura J.', startDay: 0, span: 2, type: 'secondary', avatar: 'https://placehold.co/44x44/7e469a/ffffff?text=LJ' },
      { guestName: 'Patricia L.', startDay: 4, span: 3, type: 'primary', avatar: 'https://placehold.co/44x44/003b41/ffffff?text=PL' },
    ]
  },
]

export const SHOP_BRANCHES = [
  { id: 'Chelem',   name: 'Cabañas Frida',  location: 'Chelem, Yucatán' },
  { id: 'chuburna', name: 'Casa Frida',     location: 'Chuburná, Yucatán' },
]

export const SHOP_CATEGORIES = [
  { key: 'Gastronomía', icon: 'restaurant', color: 'var(--gold)' },
  { key: 'Artesanía',   icon: 'palette',    color: 'var(--secondary)' },
  { key: 'Bienestar',   icon: 'spa',        color: 'var(--primary)' },
  { key: 'Recuerdos',   icon: 'redeem',     color: '#d97706' },
]

export const SHOP_DATA = [
  { id:  1, name: 'Miel de Mangrove',          price: 280,  stock: 24, category: 'Gastronomía', branch: 'Chelem',   img: 'https://placehold.co/400x320/ffe088/735c00?text=Miel+de+Mangrove' },
  { id:  2, name: 'Aceite de Coco Artesanal',  price: 420,  stock: 12, category: 'Gastronomía', branch: 'Chelem',   img: 'https://placehold.co/400x320/003b41/006971?text=Aceite+de+Coco' },
  { id:  3, name: 'Bolsa Tejida Yucateca',     price: 650,  stock: 8,  category: 'Artesanía',   branch: 'Chelem',   img: 'https://placehold.co/400x320/7e469a/e0a1fc?text=Bolsa+Yucateca' },
  { id:  4, name: 'Vela de Cera de Abeja',     price: 180,  stock: 35, category: 'Bienestar',   branch: 'Chelem',   img: 'https://placehold.co/400x320/ffe088/735c00?text=Vela+Artesanal' },
  { id:  5, name: 'Sal de Mar Yucatán',        price: 95,   stock: 3,  category: 'Gastronomía', branch: 'Chelem',   img: 'https://placehold.co/400x320/003b41/006971?text=Sal+de+Mar' },
  { id:  6, name: 'Hamaca Doble Tejida',       price: 1200, stock: 6,  category: 'Artesanía',   branch: 'Chelem',   img: 'https://placehold.co/400x320/7e469a/e0a1fc?text=Hamaca+Doble' },
  { id:  7, name: 'Jabón de Coco Natural',     price: 120,  stock: 42, category: 'Bienestar',   branch: 'Chelem',   img: 'https://placehold.co/400x320/003b41/006971?text=Jabón+Coco' },
  { id:  8, name: 'Chile Habanero en Polvo',   price: 65,   stock: 50, category: 'Gastronomía', branch: 'chuburna', img: 'https://placehold.co/400x320/ffe088/735c00?text=Chile+Habanero' },
  { id:  9, name: 'Taza Artesanal Frida',      price: 350,  stock: 15, category: 'Recuerdos',   branch: 'chuburna', img: 'https://placehold.co/400x320/7e469a/e0a1fc?text=Taza+Frida' },
  { id: 10, name: 'Aceite Esencial Lavanda',   price: 310,  stock: 18, category: 'Bienestar',   branch: 'chuburna', img: 'https://placehold.co/400x320/003b41/006971?text=Aceite+Lavanda' },
  { id: 11, name: 'Llavero de Madera',         price: 85,   stock: 2,  category: 'Recuerdos',   branch: 'chuburna', img: 'https://placehold.co/400x320/ffe088/735c00?text=Llavero+Madera' },
  { id: 12, name: 'Mermelada de Guayaba',      price: 160,  stock: 20, category: 'Gastronomía', branch: 'chuburna', img: 'https://placehold.co/400x320/003b41/006971?text=Mermelada+Guayaba' },
  { id: 13, name: 'Collar de Jade Artesanal',  price: 890,  stock: 4,  category: 'Artesanía',   branch: 'Chelem',   img: 'https://placehold.co/400x320/7e469a/e0a1fc?text=Collar+Jade' },
]

export const STATS = {
  occupancy: 84,
  adr: 342.50,
  dailyRevenue: 14200,
  available: 12,
  total: 85,
}

export const SALES_DATA = [
  { id: 'VT001', date: '2026-04-01', customer: 'Ana García',      branch: 'Chelem',   paymentMethod: 'card',     status: 'completed',
    items: [{ productId: 1, name: 'Miel de Mangrove',        price: 280, qty: 2 },
            { productId: 4, name: 'Vela de Cera de Abeja',   price: 180, qty: 1 }] },
  { id: 'VT002', date: '2026-04-01', customer: 'Luis Moreno',     branch: 'chuburna', paymentMethod: 'cash',     status: 'completed',
    items: [{ productId: 9, name: 'Taza Artesanal Frida',    price: 350, qty: 1 }] },
  { id: 'VT003', date: '2026-04-02', customer: 'Sofia Herrera',   branch: 'Chelem',   paymentMethod: 'card',     status: 'refunded',
    items: [{ productId: 2, name: 'Aceite de Coco Artesanal',price: 420, qty: 1 },
            { productId: 7, name: 'Jabón de Coco Natural',   price: 120, qty: 2 }] },
  { id: 'VT004', date: '2026-04-02', customer: 'Miguel Torres',   branch: 'chuburna', paymentMethod: 'transfer', status: 'completed',
    items: [{ productId:  8, name: 'Chile Habanero en Polvo', price:  65, qty: 3 },
            { productId: 10, name: 'Aceite Esencial Lavanda', price: 310, qty: 2 },
            { productId: 12, name: 'Mermelada de Guayaba',    price: 160, qty: 2 }] },
  { id: 'VT005', date: '2026-04-03', customer: 'Laura Jiménez',   branch: 'Chelem',   paymentMethod: 'cash',     status: 'completed',
    items: [{ productId: 4, name: 'Vela de Cera de Abeja',   price: 180, qty: 1 }] },
  { id: 'VT006', date: '2026-04-03', customer: 'Roberto Sánchez', branch: 'Chelem',   paymentMethod: 'card',     status: 'completed',
    items: [{ productId: 6, name: 'Hamaca Doble Tejida',     price: 1200, qty: 1 },
            { productId: 3, name: 'Bolsa Tejida Yucateca',   price:  650, qty: 1 }] },
  { id: 'VT007', date: '2026-04-04', customer: 'Elena Castro',    branch: 'chuburna', paymentMethod: 'card',     status: 'partial',
    items: [{ productId:  9, name: 'Taza Artesanal Frida',   price: 350, qty: 1 },
            { productId: 10, name: 'Aceite Esencial Lavanda',price: 310, qty: 1 }] },
  { id: 'VT008', date: '2026-04-04', customer: 'Fernando Díaz',   branch: 'Chelem',   paymentMethod: 'transfer', status: 'completed',
    items: [{ productId: 3, name: 'Bolsa Tejida Yucateca',   price: 650, qty: 1 }] },
  { id: 'VT009', date: '2026-04-05', customer: 'Patricia López',  branch: 'chuburna', paymentMethod: 'cash',     status: 'completed',
    items: [{ productId:  9, name: 'Taza Artesanal Frida',   price: 350, qty: 1 },
            { productId:  8, name: 'Chile Habanero en Polvo',price:  65, qty: 2 },
            { productId: 11, name: 'Llavero de Madera',      price:  85, qty: 3 }] },
  { id: 'VT010', date: '2026-04-05', customer: 'Andrés Morales',  branch: 'Chelem',   paymentMethod: 'card',     status: 'completed',
    items: [{ productId: 1, name: 'Miel de Mangrove',        price: 280, qty: 1 },
            { productId: 7, name: 'Jabón de Coco Natural',   price: 120, qty: 2 }] },
  { id: 'VT011', date: '2026-04-06', customer: 'Carmen Rivas',    branch: 'Chelem',   paymentMethod: 'card',     status: 'completed',
    items: [{ productId:  6, name: 'Hamaca Doble Tejida',    price: 1200, qty: 1 },
            { productId:  3, name: 'Bolsa Tejida Yucateca',  price:  650, qty: 1 },
            { productId: 13, name: 'Collar de Jade Artesanal',price: 890, qty: 1 }] },
  { id: 'VT012', date: '2026-04-06', customer: 'Jorge Salinas',   branch: 'chuburna', paymentMethod: 'cash',     status: 'completed',
    items: [{ productId: 12, name: 'Mermelada de Guayaba',   price: 160, qty: 1 }] },
]

export const REFUNDS_DATA = [
  { id: 'DV001', saleId: 'VT003', date: '2026-04-02', customer: 'Sofia Herrera', branch: 'Chelem',   reason: 'Producto dañado al recibirlo',   amount: 660, status: 'approved' },
  { id: 'DV002', saleId: 'VT007', date: '2026-04-04', customer: 'Elena Castro',  branch: 'chuburna', reason: 'Error en el cobro (doble cargo)', amount: 310, status: 'pending'  },
  { id: 'DV003', saleId: '—',     date: '2026-04-05', customer: 'Mario Vega',    branch: 'Chelem',   reason: 'Cliente insatisfecho',            amount: 280, status: 'rejected' },
]
