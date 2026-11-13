// Change this to your render.com URL once deployed
const API_URL = 'http://localhost:3000';

const { createApp } = Vue;

createApp({
  data() {
    return {
      siteName: 'After School Lessons',
      lessons: [],
      sortAttribute: 'topic', // which field to sort on
      sortOrder: 'asc',       // 'asc' or 'desc'
      // TODO: cart, showCart, name, phone, searchText
    };
  },
  methods: {
    // TODO: addToCart, removeFromCart, toggleCart, checkout (POST + PUT)
  },
  computed: {
    // Returns a sorted COPY of lessons; re-runs automatically when
    // lessons, sortAttribute or sortOrder change.
    sortedLessons() {
      const attr = this.sortAttribute;
      const direction = this.sortOrder === 'asc' ? 1 : -1;

      return [...this.lessons].sort((a, b) => {
        if (a[attr] > b[attr]) return 1 * direction;
        if (a[attr] < b[attr]) return -1 * direction;
        return 0;
      });
    },
    // TODO: canCheckout (regex validation), cartCount
  },
  mounted() {
    // GET all lessons using fetch + promises
    fetch(`${API_URL}/lessons`)
      .then((response) => response.json())
      .then((data) => {
        this.lessons = data;
      })
      .catch((err) => console.error('Error loading lessons:', err));
  },
}).mount('#app');
