module.exports = {
  content: ['./public/index.html','./public/app.js'],
  theme: { extend: {
    colors: {
      redsun: { 50:'#FEF2F2',100:'#FEE2E2',200:'#FECACA',500:'#EF4444',600:'#DC2626',700:'#B91C1C',800:'#991B1B',900:'#7F1D1D',950:'#450A0A' },
      gold:   { 50:'#FFFBEB',100:'#FEF3C7',300:'#FCD34D',400:'#FBBF24',500:'#F59E0B',600:'#D97706',700:'#B45309',800:'#92400E' }
    },
    fontFamily: { sans: ['"Be Vietnam Pro"','system-ui','sans-serif'] }
  } }
};
