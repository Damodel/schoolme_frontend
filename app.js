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

      // Cart: one entry per lesson -> { lessonId, topic, location, price, quantity }
      cart: [],
      showCart: false,        // false = lessons page, true = cart page

      // Checkout form
      name: '',
      phone: '',
      orderMessage: '',       // confirmation (or error) shown after checkout

      // Search (challenge) - results come from the back-end
      searchText: '',

      // Teachers (challenge)
      teachers: [],
      selectedTeacherId: '',  // '' = show all lessons
    };
  },

  methods: {
    // ---------- Loading lessons ----------

    // GET /lessons, or GET /search?q=... when there is search text
    loadLessons() {
      const url = this.searchText.trim()
        ? `${API_URL}/search?q=${encodeURIComponent(this.searchText.trim())}`
        : `${API_URL}/lessons`;

      fetch(url)
        .then((response) => response.json())
        .then((data) => {
          // The server doesn't know about the cart yet, so take away the
          // spaces that are already in the cart from what the server says.
          data.forEach((lesson) => {
            const item = this.findCartItem(lesson._id);
            if (item) lesson.space -= item.quantity;
          });
          this.lessons = data;
        })
        .catch((err) => console.error('Error loading lessons:', err));
    },

    loadTeachers() {
      fetch(`${API_URL}/teachers`)
        .then((response) => response.json())
        .then((data) => {
          this.teachers = data;
        })
        .catch((err) => console.error('Error loading teachers:', err));
    },

    // ---------- Cart ----------

    findCartItem(lessonId) {
      return this.cart.find((item) => item.lessonId === lessonId);
    },

    // Adds ONE space of a lesson to the cart
    addToCart(lesson) {
      if (lesson.space <= 0) return; // safety check (button is disabled anyway)

      lesson.space--;

      const item = this.findCartItem(lesson._id);
      if (item) {
        item.quantity++;
      } else {
        this.cart.push({
          lessonId: lesson._id,
          topic: lesson.topic,
          location: lesson.location,
          price: lesson.price,
          quantity: 1,
        });
      }
    },

    // Removes ONE space from the cart and gives it back to the lesson list
    removeFromCart(item) {
      const lesson = this.lessons.find((l) => l._id === item.lessonId);
      if (lesson) lesson.space++;

      item.quantity--;
      if (item.quantity === 0) {
        this.cart = this.cart.filter((i) => i !== item);
      }

      // If the cart is now empty, go back to the lessons page
      if (this.cart.length === 0) this.showCart = false;
    },

    toggleCart() {
      this.showCart = !this.showCart;
      this.orderMessage = '';
    },

    // ---------- Checkout ----------

    checkout() {
      if (!this.canCheckout) return;

      const order = {
        name: this.name.trim(),
        phone: this.phone.trim(),
        lessonIDs: this.cart.map((item) => item.lessonId),
        spaces: this.cart.map((item) => item.quantity), // spaces[i] belongs to lessonIDs[i]
      };

      // 1) POST the new order
      fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      })
        .then((response) => {
          if (!response.ok) throw new Error('Order could not be saved');
          return response.json();
        })
        // 2) PUT the new number of spaces for every lesson in the cart
        .then(() => {
          const updates = this.cart.map((item) => {
            const lesson = this.lessons.find((l) => l._id === item.lessonId);
            return fetch(`${API_URL}/lessons/${item.lessonId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ space: lesson.space }), // set to an exact number
            });
          });
          return Promise.all(updates); // wait for all PUTs to finish
        })
        // 3) Show confirmation and reset the cart/form
        .then(() => {
          this.orderMessage = `Thank you ${order.name}, your order has been submitted!`;
          this.cart = [];
          this.name = '';
          this.phone = '';
        })
        .catch((err) => {
          console.error(err);
          this.orderMessage = 'Sorry, something went wrong. Please try again.';
        });
    },
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

    // Sorted lessons, filtered by the chosen teacher (if any)
    visibleLessons() {
      if (!this.selectedTeacherId) return this.sortedLessons;

      const teacher = this.teachers.find((t) => t._id === this.selectedTeacherId);
      if (!teacher) return this.sortedLessons;

      return this.sortedLessons.filter((lesson) => teacher.lessonIDs.includes(lesson._id));
    },

    // Total number of spaces in the cart (shown on the cart button)
    cartCount() {
      return this.cart.reduce((total, item) => total + item.quantity, 0);
    },

    cartTotal() {
      return this.cart.reduce((total, item) => total + item.price * item.quantity, 0);
    },

    // Name: letters (and spaces) only. Phone: digits only.
    isNameValid() {
      return /^[A-Za-z\s]+$/.test(this.name.trim());
    },
    isPhoneValid() {
      return /^\d+$/.test(this.phone.trim());
    },
    canCheckout() {
      return this.isNameValid && this.isPhoneValid && this.cart.length > 0;
    },
  },

  watch: {
    // Every time the user types in the search box, ask the back-end again
    searchText() {
      this.loadLessons();
    },
  },

  mounted() {
    this.loadLessons();
    this.loadTeachers();
  },
}).mount('#app');
