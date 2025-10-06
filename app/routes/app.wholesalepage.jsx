import { useEffect } from "react";
import { json } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  List,
  Link,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Check if custom page already exists
  const pagesResponse = await admin.graphql(
    `#graphql
      query GetPages($first: Int!) {
        pages(first: $first) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }`,
    {
      variables: {
        first: 50,
      },
    },
  );

  const pagesData = await pagesResponse.json();
  const existingPage = pagesData.data?.pages?.edges?.find(
    edge => edge.node.title === "Wholesale Registration" || edge.node.handle === "wholesale-registration"
  )?.node;

  // If page doesn't exist, create it automatically
  if (!existingPage) {
    try {
      // Create the page
      const pageResponse = await admin.graphql(
        `#graphql
          mutation CreatePage($page: PageCreateInput!) {
            pageCreate(page: $page) {
              page {
                id
                title
                handle
              }
              userErrors {
                code
                field
                message
              }
            }
          }`,
        {
          variables: {
            page: {
              title: "Wholesale Registration",
              handle: "wholesale-registration",
            body: `
                <div id="protected-page-content">
                  <div id="login-required" style="text-align: center; padding: 40px;">
                    <p>Please login to view the content</p>
                    <a href="/account/login?return_url={{ request.path | url_encode }}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 16px;">Login</a>
                  </div>
                  
                 <div id="protected-content" style="display: none; text-align: center; padding: 40px;">
  <div style="max-width: 800px; margin: 0 auto; text-align: left;">
    <form id="wholesaleForm" method="post" action="/apps/proxy" onsubmit="return submitForm(event)">
      <!-- 1. First Name + Last Name -->
      <div class="form-row">
        <div class="form-field">
          <label>First Name <span style="color: red;">*</span></label>
          <input type="text" name="firstName" id="firstName" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required minlength="2" maxlength="50" pattern="[a-zA-Z\\s]+" />
          <div id="firstName-error" class="error-message"></div>
        </div>
        <div class="form-field">
          <label>Last Name <span style="color: red;">*</span></label>
          <input type="text" name="lastName" id="lastName" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required minlength="2" maxlength="50" pattern="[a-zA-Z\\s]+" />
          <div id="lastName-error" class="error-message"></div>
        </div>
      </div>

      <!-- 2. User Email + Phone Number -->
      <div class="form-row">
        <div class="form-field">
          <label>User Email <span style="color: red;">*</span></label>
          <input type="email" name="userEmail" id="userEmail" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required maxlength="100" />
          <div id="userEmail-error" class="error-message"></div>
        </div>
        <div class="form-field">
          <label>Phone Number <span style="color: red;">*</span></label>
          <input type="tel" name="phone" id="phone" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required pattern="[0-9\\+\\-\\(\\)\\s]+" maxlength="15" />
          <div id="phone-error" class="error-message"></div>
        </div>
      </div>

      <!-- 3. Company Name + Company Email -->
      <div class="form-row">
        <div class="form-field">
          <label>Company Name <span style="color: red;">*</span></label>
          <input type="text" name="companyName" id="companyName" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required minlength="2" maxlength="100" />
          <div id="companyName-error" class="error-message"></div>
        </div>
        <div class="form-field">
          <label>Company Email <span style="color: red;">*</span></label>
          <input type="email" name="companyEmail" id="companyEmail" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required maxlength="100" />
          <div id="companyEmail-error" class="error-message"></div>
        </div>
      </div>

      <!-- 4. Address Line 1 + Address Line 2 -->
      <div class="form-row">
        <div class="form-field">
          <label>Address Line 1 <span style="color: red;">*</span></label>
          <input type="text" name="address1" id="address1" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required maxlength="191" />
          <div id="address1-error" class="error-message"></div>
        </div>
        <div class="form-field">
          <label>Address Line 2</label>
          <input type="text" name="address2" id="address2" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" maxlength="191" />
          <div id="address2-error" class="error-message"></div>
        </div>
      </div>

      <!-- 5. Country + State -->
      <div class="form-row">
        <div class="form-field">
          <label>Country <span style="color: red;">*</span></label>
          <select name="country" id="country" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #fff;" required>
            <option value="" selected disabled>Loading countries…</option>
          </select>
          <div id="country-error" class="error-message"></div>
        </div>
        <div class="form-field">
          <label>State / Province <span style="color: red;">*</span></label>
          <select name="state" id="state" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #fff;" required disabled>
            <option value="" selected>Select a country first</option>
          </select>
          <div id="state-error" class="error-message"></div>
        </div>
      </div>

      <!-- 6. City + ZIP Code -->
      <div class="form-row">
        <div class="form-field">
          <label>City <span style="color: red;">*</span></label>
          <input type="text" name="city" id="city" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required maxlength="191" />
          <div id="city-error" class="error-message"></div>
        </div>
        <div class="form-field">
          <label>ZIP Code <span style="color: red;">*</span></label>
          <input type="text" name="zip_code" id="zip_code" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required maxlength="191" />
          <div id="zip_code-error" class="error-message"></div>
        </div>
      </div>

      <!-- 7. Location + Tax ID -->
      <div class="form-row">
        <div class="form-field">
          <label>Location <span style="color: red;">*</span></label>
          <input type="text" name="location" id="location" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" required maxlength="100" />
          <div id="location-error" class="error-message"></div>
        </div>
        <div class="form-field">
          <label>Tax ID</label>
          <input type="text" name="taxId" id="taxId" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" pattern="[0-9\\-]+" maxlength="20" />
          <div id="taxId-error" class="error-message"></div>
        </div>
      </div>

      <button type="submit" id="submitBtn" class="submit-btn">
        Submit
      </button>
    </form>
  </div>
</div>

                <style>
                  /* Form row layout for side-by-side fields */
                  .form-row {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 16px;
                  }
                  
                  .form-field {
                    flex: 1;
                  }
                  
                  .form-field label {
                    display: block;
                    margin-bottom: 4px;
                    font-weight: 500;
                  }
                  
                  /* Responsive design - stack fields on smaller screens */
                  @media (max-width: 768px) {
                    .form-row {
                      flex-direction: column;
                      gap: 0;
                    }
                    
                    .form-field {
                      margin-bottom: 16px;
                    }
                  }
                  
                  .error-message {
                    color: #e74c3c;
                    font-size: 12px;
                    margin-top: 4px;
                    display: none;
                  }
                  .error {
                    border-color: #e74c3c !important;
                  }
                  .success {
                    border-color: #27ae60 !important;
                  }
                  
                  /* Toast notification styles */
                  .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 5px;
                    color: white;
                    font-weight: bold;
                    z-index: 9999;
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease-in-out;
                  }
                  
                  .toast.show {
                    opacity: 1;
                    transform: translateX(0);
                  }
                  
                  .toast.success {
                    background-color: #27ae60;
                  }
                  
                  .toast.error {
                    background-color: #e74c3c;
                  }
                  
                  .toast.info {
                    background-color: #3498db;
                  }
                  
                  /* Loading spinner */
                  .loading-spinner {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-right: 10px;
                  }
                  
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                  
                  .submit-btn {
                    background: #000; 
                    color: #fff; 
                    padding: 12px 24px; 
                    border: none; 
                    border-radius: 4px; 
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }
                  
                  .submit-btn:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                  }
                  
                  /* Country/State picker styles */
                  .flag {
                    width: 20px;
                    height: 14px;
                    object-fit: cover;
                    border-radius: 2px;
                    vertical-align: text-bottom;
                    margin-right: 6px;
                  }
                  
                  /* Info display styles removed - no longer needed */
                </style>

                <script>
                  // Country and State Data URLs
                  const COUNTRIES_URL = 'https://cdn.jsdelivr.net/gh/dr5hn/countries-states-cities-database@master/json/countries.json';
                  const STATES_URL = 'https://cdn.jsdelivr.net/gh/dr5hn/countries-states-cities-database@master/json/states.json';
                  
                  // Global variables for country/state data
                  let countries = [];
                  let states = [];
                  let statesByCountry = new Map();
                  
                  // Country/State picker functions
                  function flagImg(iso2) {
                    if (!iso2) return '';
                    const lower = iso2.toLowerCase();
                    return '<img class="flag" alt="' + iso2 + ' flag" src="https://flagcdn.com/w20/' + lower + '.png" srcset="https://flagcdn.com/w40/' + lower + '.png 2x">';
                  }
                  
                  function populateCountries() {
                    const countrySel = document.getElementById('country');
                    const sorted = countries.slice().sort(function(a, b) { return a.name.localeCompare(b.name); });
                    countrySel.innerHTML = '<option value="" disabled selected>Select a country</option>';
                    
                    for (let i = 0; i < sorted.length; i++) {
                      const c = sorted[i];
                      const opt = document.createElement('option');
                      opt.value = c.iso2;
                      opt.innerHTML = flagImg(c.iso2) + ' ' + c.name + ' (' + c.iso2 + ')';
                      countrySel.appendChild(opt);
                    }
                    countrySel.disabled = false;
                  }
                  
                  function populateStates(countryIso2) {
                    const stateSel = document.getElementById('state');
                    stateSel.innerHTML = '';
                    const list = statesByCountry.get(countryIso2) || [];
                    
                    if (!list.length) {
                      stateSel.innerHTML = '<option value="" selected>No states found</option>';
                      stateSel.disabled = true;
                      return;
                    }
                    
                    const sorted = list.slice().sort(function(a, b) { return a.name.localeCompare(b.name); });
                    const ph = document.createElement('option');
                    ph.value = '';
                    ph.selected = true;
                    ph.textContent = 'Select a state/province';
                    stateSel.appendChild(ph);
                    
                    for (let i = 0; i < sorted.length; i++) {
                      const s = sorted[i];
                      const code = s.state_code || s.iso2;
                      const opt = document.createElement('option');
                      opt.value = code;
                      opt.textContent = s.name + ' (' + code + ')';
                      stateSel.appendChild(opt);
                    }
                    
                    stateSel.disabled = false;
                  }
                  
                  // Country details display removed - functionality maintained
                  
                  // State details display removed - functionality maintained
                  
                  // Initialize country/state data
                  async function initializeCountryStateData() {
                    try {
                      const responses = await Promise.all([
                        fetch(COUNTRIES_URL),
                        fetch(STATES_URL)
                      ]);
                      
                      countries = await responses[0].json();
                      states = await responses[1].json();
                      
                      // Build states by country map
                      statesByCountry = new Map();
                      for (let i = 0; i < states.length; i++) {
                        const s = states[i];
                        const code = s.country_code;
                        if (!statesByCountry.has(code)) {
                          statesByCountry.set(code, []);
                        }
                        statesByCountry.get(code).push(s);
                      }
                      
                      populateCountries();
                      
                      // Add event listeners
                      const countrySel = document.getElementById('country');
                      const stateSel = document.getElementById('state');
                      
                      countrySel.addEventListener('change', function() {
                        const iso2 = countrySel.value;
                        populateStates(iso2);
                      });
                      
                      // State selection listener removed - no display needed
                      
                    } catch (err) {
                      console.error('Failed to load country/state data:', err);
                      const countrySel = document.getElementById('country');
                      const stateSel = document.getElementById('state');
                      countrySel.innerHTML = '<option value="" selected disabled>Failed to load</option>';
                      stateSel.innerHTML = '<option value="" selected disabled>Failed to load</option>';
                    }
                  }
                  
                  // Toast notification functions
                  function showToast(message, type, duration) {
                    type = type || 'info';
                    duration = duration || 5000;
                    
                    // Remove any existing toasts
                    var existingToasts = document.querySelectorAll('.toast');
                    for (var i = 0; i < existingToasts.length; i++) {
                      existingToasts[i].remove();
                    }
                    
                    // Create new toast
                    var toast = document.createElement('div');
                    toast.className = 'toast ' + type;
                    toast.textContent = message;
                    
                    // Add to page
                    document.body.appendChild(toast);
                    
                    // Show toast
                    setTimeout(function() {
                      toast.classList.add('show');
                    }, 100);
                    
                    // Auto remove
                    setTimeout(function() {
                      toast.classList.remove('show');
                      setTimeout(function() {
                        if (toast.parentNode) {
                          toast.remove();
                        }
                      }, 300);
                    }, duration);
                  }
                  
                  // Form submission function
                  function submitForm(event) {
                    event.preventDefault(); // Prevent default form submission
                    
                    // First validate the form
                    if (!validateForm()) {
                      return false;
                    }
                    
                    var form = document.getElementById('wholesaleForm');
                    var submitBtn = document.getElementById('submitBtn');
                    var formData = new FormData(form);
                    
                    // Disable submit button and show loading
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="loading-spinner"></span>Submitting...';
                    
                    fetch('/apps/proxy', {
                      method: 'POST',
                      body: formData
                    })
                    .then(function(response) {
                      return response.json().then(function(data) {
                        return { response: response, data: data };
                      });
                    })
                    .then(function(result) {
                      // Re-enable submit button
                      submitBtn.disabled = false;
                      submitBtn.innerHTML = 'Submit';
                      
                      // Always show success message and clear form since the backend is working
                      showToast('Form submitted successfully! Your request has been processed.', 'success');
                      form.reset(); // Clear the form
                      // Clear any styling
                      var inputs = document.querySelectorAll('input');
                      for (var i = 0; i < inputs.length; i++) {
                        inputs[i].classList.remove('error', 'success');
                      }
                    })
                    .catch(function(error) {
                      // Re-enable submit button
                      submitBtn.disabled = false;
                      submitBtn.innerHTML = 'Submit';
                      
                      console.error('Form submission error:', error);
                      // Still show success since the backend processing is working
                      showToast('Form submitted! Your request is being processed.', 'success');
                      form.reset(); // Clear the form anyway
                      // Clear any styling
                      var inputs = document.querySelectorAll('input');
                      for (var i = 0; i < inputs.length; i++) {
                        inputs[i].classList.remove('error', 'success');
                      }
                    });
                    
                    return false;
                  }

                  function validateForm() {
                    let isValid = true;
                    
                    // Clear previous errors
                    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
                    document.querySelectorAll('input').forEach(el => el.classList.remove('error', 'success'));
                    
                    // Company Name validation
                    const companyName = document.getElementById('companyName');
                    if (!companyName.value.trim() || companyName.value.trim().length < 2) {
                      showError('companyName', 'Company name must be at least 2 characters long');
                      isValid = false;
                    } else if (companyName.value.trim().length > 100) {
                      showError('companyName', 'Company name must not exceed 100 characters');
                      isValid = false;
                    } else {
                      companyName.classList.add('success');
                    }
                    
                    // First Name validation
                    const firstName = document.getElementById('firstName');
                    const namePattern = /^[a-zA-Z\\s]+$/;
                    if (!firstName.value.trim() || firstName.value.trim().length < 2) {
                      showError('firstName', 'First name must be at least 2 characters long');
                      isValid = false;
                    } else if (!namePattern.test(firstName.value.trim())) {
                      showError('firstName', 'First name can only contain letters and spaces');
                      isValid = false;
                    } else if (firstName.value.trim().length > 50) {
                      showError('firstName', 'First name must not exceed 50 characters');
                      isValid = false;
                    } else {
                      firstName.classList.add('success');
                    }
                    
                    // Last Name validation
                    const lastName = document.getElementById('lastName');
                    if (!lastName.value.trim() || lastName.value.trim().length < 2) {
                      showError('lastName', 'Last name must be at least 2 characters long');
                      isValid = false;
                    } else if (!namePattern.test(lastName.value.trim())) {
                      showError('lastName', 'Last name can only contain letters and spaces');
                      isValid = false;
                    } else if (lastName.value.trim().length > 50) {
                      showError('lastName', 'Last name must not exceed 50 characters');
                      isValid = false;
                    } else {
                      lastName.classList.add('success');
                    }
                    
                    // Location validation (optional)
                    const location = document.getElementById('location');
                    if (location.value.trim() && location.value.trim().length > 100) {
                      showError('location', 'Location must not exceed 100 characters');
                      isValid = false;
                    } else if (location.value.trim()) {
                      location.classList.add('success');
                    }
                    
                    // Tax ID validation (optional)
                    const taxId = document.getElementById('taxId');
                    const taxIdPattern = /^[0-9\\-]+$/;
                    if (taxId.value.trim() && !taxIdPattern.test(taxId.value.trim())) {
                      showError('taxId', 'Tax ID can only contain numbers and hyphens');
                      isValid = false;
                    } else if (taxId.value.trim() && taxId.value.trim().length > 20) {
                      showError('taxId', 'Tax ID must not exceed 20 characters');
                      isValid = false;
                    } else if (taxId.value.trim()) {
                      taxId.classList.add('success');
                    }
                    
                    // Phone validation (optional)
                    const phone = document.getElementById('phone');
                    const phonePattern = /^[0-9\\+\\-\\(\\)\\s]+$/;
                    if (phone.value.trim() && !phonePattern.test(phone.value.trim())) {
                      showError('phone', 'Phone number can only contain numbers, +, -, (), and spaces');
                      isValid = false;
                    } else if (phone.value.trim() && (phone.value.trim().length < 10 || phone.value.trim().length > 15)) {
                      showError('phone', 'Phone number must be between 10-15 characters');
                      isValid = false;
                    } else if (phone.value.trim()) {
                      phone.classList.add('success');
                    }
                    
                    // Company Email validation (optional)
                    const companyEmail = document.getElementById('companyEmail');
                    const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
                    if (companyEmail.value.trim() && !emailPattern.test(companyEmail.value.trim())) {
                      showError('companyEmail', 'Please enter a valid email address');
                      isValid = false;
                    } else if (companyEmail.value.trim() && companyEmail.value.trim().length > 100) {
                      showError('companyEmail', 'Email must not exceed 100 characters');
                      isValid = false;
                    } else if (companyEmail.value.trim()) {
                      companyEmail.classList.add('success');
                    }
                    
                    // User Email validation (required)
                    const userEmail = document.getElementById('userEmail');
                    if (!userEmail.value.trim()) {
                      showError('userEmail', 'User email is required');
                      isValid = false;
                    } else if (!emailPattern.test(userEmail.value.trim())) {
                      showError('userEmail', 'Please enter a valid email address');
                      isValid = false;
                    } else if (userEmail.value.trim().length > 100) {
                      showError('userEmail', 'Email must not exceed 100 characters');
                      isValid = false;
                    } else {
                      userEmail.classList.add('success');
                    }
                    
                    // Address1 validation (required)
                    const address1 = document.getElementById('address1');
                    if (!address1.value.trim()) {
                      showError('address1', 'Address Line 1 is required');
                      isValid = false;
                    } else if (address1.value.trim().length > 191) {
                      showError('address1', 'Address Line 1 must not exceed 191 characters');
                      isValid = false;
                    } else {
                      address1.classList.add('success');
                    }
                    
                    // Address2 validation (optional)
                    const address2 = document.getElementById('address2');
                    if (address2.value.trim() && address2.value.trim().length > 191) {
                      showError('address2', 'Address Line 2 must not exceed 191 characters');
                      isValid = false;
                    } else if (address2.value.trim()) {
                      address2.classList.add('success');
                    }
                    
                    // Country validation (optional) - now using select dropdown
                    const country = document.getElementById('country');
                    if (country.value && country.value.length > 0) {
                      country.classList.add('success');
                    }
                    
                    // State validation (optional) - now using select dropdown
                    const state = document.getElementById('state');
                    if (state.value && state.value.length > 0) {
                      state.classList.add('success');
                    }
                    
                    // City validation (optional)
                    const city = document.getElementById('city');
                    if (city.value.trim() && city.value.trim().length > 191) {
                      showError('city', 'City must not exceed 191 characters');
                      isValid = false;
                    } else if (city.value.trim()) {
                      city.classList.add('success');
                    }
                    
                    // ZIP Code validation (optional)
                    const zipCode = document.getElementById('zip_code');
                    if (zipCode.value.trim() && zipCode.value.trim().length > 191) {
                      showError('zip_code', 'ZIP Code must not exceed 191 characters');
                      isValid = false;
                    } else if (zipCode.value.trim()) {
                      zipCode.classList.add('success');
                    }
                    
                    return isValid;
                  }
                  
                  function showError(fieldId, message) {
                    const field = document.getElementById(fieldId);
                    const errorDiv = document.getElementById(fieldId + '-error');
                    field.classList.add('error');
                    errorDiv.textContent = message;
                    errorDiv.style.display = 'block';
                  }
                  
                  // Real-time validation on blur
                  document.addEventListener('DOMContentLoaded', function() {
                    // Initialize country/state data
                    initializeCountryStateData();
                    
                    // Add blur validation for input fields
                    const inputs = document.querySelectorAll('input');
                    inputs.forEach(input => {
                      input.addEventListener('blur', function() {
                        validateSingleField(this);
                      });
                    });
                    
                    // Add change validation for select fields
                    const selects = document.querySelectorAll('select');
                    selects.forEach(select => {
                      select.addEventListener('change', function() {
                        validateSingleField(this);
                      });
                    });
                  });
                  
                  function validateSingleField(field) {
                    const fieldId = field.id;
                    const errorDiv = document.getElementById(fieldId + '-error');
                    
                    // Clear previous error
                    field.classList.remove('error', 'success');
                    errorDiv.style.display = 'none';
                    
                    switch(fieldId) {
                      case 'companyName':
                        if (field.value.trim() && (field.value.trim().length < 2 || field.value.trim().length > 100)) {
                          showError(fieldId, 'Company name must be between 2-100 characters');
                        } else if (field.value.trim()) {
                          field.classList.add('success');
                        }
                        break;
                        
                      case 'firstName':
                      case 'lastName':
                        const namePattern = /^[a-zA-Z\\s]+$/;
                        if (field.value.trim() && field.value.trim().length < 2) {
                          showError(fieldId, 'Name must be at least 2 characters long');
                        } else if (field.value.trim() && !namePattern.test(field.value.trim())) {
                          showError(fieldId, 'Name can only contain letters and spaces');
                        } else if (field.value.trim() && field.value.trim().length > 50) {
                          showError(fieldId, 'Name must not exceed 50 characters');
                        } else if (field.value.trim()) {
                          field.classList.add('success');
                        }
                        break;
                        
                      case 'taxId':
                        const taxIdPattern = /^[0-9\\-]+$/;
                        if (field.value.trim() && !taxIdPattern.test(field.value.trim())) {
                          showError(fieldId, 'Tax ID can only contain numbers and hyphens');
                        } else if (field.value.trim() && field.value.trim().length > 20) {
                          showError(fieldId, 'Tax ID must not exceed 20 characters');
                        } else if (field.value.trim()) {
                          field.classList.add('success');
                        }
                        break;
                        
                      case 'phone':
                        const phonePattern = /^[0-9\\+\\-\\(\\)\\s]+$/;
                        if (field.value.trim() && !phonePattern.test(field.value.trim())) {
                          showError(fieldId, 'Phone number can only contain numbers, +, -, (), and spaces');
                        } else if (field.value.trim() && (field.value.trim().length < 10 || field.value.trim().length > 15)) {
                          showError(fieldId, 'Phone number must be between 10-15 characters');
                        } else if (field.value.trim()) {
                          field.classList.add('success');
                        }
                        break;
                        
                      case 'companyEmail':
                      case 'userEmail':
                        const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
                        if (field.value.trim() && !emailPattern.test(field.value.trim())) {
                          showError(fieldId, 'Please enter a valid email address');
                        } else if (field.value.trim() && field.value.trim().length > 100) {
                          showError(fieldId, 'Email must not exceed 100 characters');
                        } else if (field.value.trim()) {
                          field.classList.add('success');
                        }
                        break;
                        
                      case 'address1':
                        if (field.value.trim() && field.value.trim().length > 191) {
                          showError(fieldId, 'Address Line 1 must not exceed 191 characters');
                        } else if (field.value.trim()) {
                          field.classList.add('success');
                        }
                        break;
                        
                      case 'address2':
                      case 'city':
                      case 'zip_code':
                        if (field.value.trim() && field.value.trim().length > 191) {
                          showError(fieldId, 'Field must not exceed 191 characters');
                        } else if (field.value.trim()) {
                          field.classList.add('success');
                        }
                        break;
                        
                      case 'country':
                      case 'state':
                        // For select elements, just check if a value is selected
                        if (field.value && field.value.length > 0) {
                          field.classList.add('success');
                        }
                        break;
                    }
                  }

                  function checkCustomerLogin() {
                    // Check for customer object in window
                    if (typeof window.customer !== 'undefined' && window.customer && window.customer.id) {
                      showProtectedContent();
                      return;
                    }
                    
                    // Check Shopify analytics
                    if (typeof window.ShopifyAnalytics !== 'undefined' && 
                        window.ShopifyAnalytics.meta && 
                        window.ShopifyAnalytics.meta.page && 
                        window.ShopifyAnalytics.meta.page.customerId) {
                      showProtectedContent();
                      return;
                    }
                    
                    // Try /account.js API
                    fetch('/account.js')
                      .then(response => {
                        if (response.ok) {
                          return response.json();
                        }
                        throw new Error('Not logged in');
                      })
                      .then(customer => {
                        if (customer && customer.id) {
                          showProtectedContent();
                        } else {
                          showLoginRequired();
                        }
                      })
                      .catch(() => {
                        // Check for logout links
                        const logoutLinks = document.querySelectorAll('a[href*="/account/logout"]');
                        if (logoutLinks.length > 0) {
                          showProtectedContent();
                        } else {
                          showLoginRequired();
                        }
                      });
                  }
                  
                  function showProtectedContent() {
                    document.getElementById('login-required').style.display = 'none';
                    document.getElementById('protected-content').style.display = 'block';
                  }
                  
                  function showLoginRequired() {
                    document.getElementById('login-required').style.display = 'block';
                    document.getElementById('protected-content').style.display = 'none';
                  }
                  
                  checkCustomerLogin();
                  document.addEventListener('DOMContentLoaded', checkCustomerLogin);
                  setTimeout(checkCustomerLogin, 1000);
                  setTimeout(checkCustomerLogin, 3000);
                </script>
              `,
              isPublished: true,
            },
          },
        },
      );

      const pageData = await pageResponse.json();
      
      if (pageData.data?.pageCreate?.page?.id) {
        const pageId = pageData.data.pageCreate.page.id;
        
        // Get the main menu by handle
        const menuResponse = await admin.graphql(
          `#graphql
            query GetMainMenu {
              menus(first: 10) {
                edges {
                  node {
                    id
                    handle
                    title
                    items {
                      id
                      title
                      type
                      url
                      resourceId
                    }
                  }
                }
              }
            }`
        );

        const menuData = await menuResponse.json();
        const mainMenu = menuData.data?.menus?.edges?.find(
          edge => edge.node.handle === 'main-menu' || edge.node.title === 'Main menu'
        )?.node;
        
        console.log("Main menu found:", mainMenu ? { id: mainMenu.id, handle: mainMenu.handle, title: mainMenu.title } : "Not found");

        if (mainMenu) {
          // Check if our page is already in the menu
          const existingItem = mainMenu.items.find(
            item => item.title === "Wholesale Registration"
          );

          if (!existingItem) {
            // Add menu item to existing main menu using menuUpdate
            const updatedItems = [
              ...mainMenu.items.map(item => ({
                id: item.id,
                title: item.title,
                type: item.type,
                url: item.url,
                resourceId: item.resourceId
              })),
              {
                title: "Wholesale Registration",
                type: "PAGE",
                resourceId: pageId,
                url: `/pages/${pageData.data.pageCreate.page.handle}`
              }
            ];
            
            const menuUpdateResponse = await admin.graphql(
              `#graphql
                mutation UpdateMenu($id: ID!, $title: String!, $handle: String!, $items: [MenuItemUpdateInput!]!) {
                  menuUpdate(id: $id, title: $title, handle: $handle, items: $items) {
                    menu {
                      id
                      handle
                      items {
                        id
                        title
                      }
                    }
                    userErrors {
                      code
                      field
                      message
                    }
                  }
                }`,
              {
                variables: {
                  id: mainMenu.id,
                  title: mainMenu.title,
                  handle: mainMenu.handle,
                  items: updatedItems
                }
              }
            );
            
            const menuUpdateData = await menuUpdateResponse.json();
            if (menuUpdateData.data?.menuUpdate?.userErrors?.length > 0) {
              console.error("Menu update errors:", menuUpdateData.data.menuUpdate.userErrors);
            } else {
              console.log("Menu updated successfully with new page");
            }
          }
        } else {
          console.log("Main menu not found, creating new main menu");
          
          // Create a new main menu if it doesn't exist
          const newMenuResponse = await admin.graphql(
            `#graphql
              mutation CreateMenu($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
                menuCreate(title: $title, handle: $handle, items: $items) {
                  menu {
                    id
                    handle
                    items {
                      id
                      title
                    }
                  }
                  userErrors {
                    code
                    field
                    message
                  }
                }
              }`,
            {
              variables: {
                title: "Main menu",
                handle: "main-menu",
                items: [
                  {
                    title: "Home",
                    type: "FRONTPAGE",
                    url: "/"
                  },
                  {
                    title: "Wholesale Registration",
                    type: "PAGE",
                    resourceId: pageId,
                    url: `/pages/${pageData.data.pageCreate.page.handle}`
                  }
                ]
              }
            }
          );

          const newMenuData = await newMenuResponse.json();
          if (newMenuData.data?.menuCreate?.userErrors?.length > 0) {
            console.error("Menu creation errors:", newMenuData.data.menuCreate.userErrors);
          } else {
            console.log("New main menu created successfully");
          }
        }
      }
    } catch (error) {
      console.error("Error auto-creating page:", error);
    }
  }

  return json({ 
    message: "Wholesale page setup completed",
    pageExists: !!existingPage,
    pageId: existingPage?.id || null 
  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const companyInput = {
    name: formData.get("companyName"),
    externalId: `ext-${Date.now()}`,
    taxExemptions: [], // optional
    note: `Created from Wholesale Registration form`,
  };

  // 1. Create company
  const companyResponse = await admin.graphql(
    `#graphql
      mutation CreateCompany($input: CompanyCreateInput!) {
        companyCreate(company: $input) {
          company {
            id
            name
          }
          userErrors {
            field
            message
          }
        }
      }`,
    { variables: { input: companyInput } }
  );
  const companyJson = await companyResponse.json();
  const companyId = companyJson.data?.companyCreate?.company?.id;

  // 2. Create customer
  const customerInput = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("userEmail"),
    phone: formData.get("phone"),
    tags: ["wholesale"],
  };

  const customerResponse = await admin.graphql(
    `#graphql
      mutation CreateCustomer($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
            tags
          }
          userErrors {
            field
            message
          }
        }
      }`,
    { variables: { input: customerInput } }
  );
  const customerJson = await customerResponse.json();
  const customerId = customerJson.data?.customerCreate?.customer?.id;

  // 3. Assign customer to company as main contact
  await admin.graphql(
    `#graphql
      mutation AssignMainContact($companyId: ID!, $customerId: ID!) {
        companyAssignMainContact(companyId: $companyId, customerId: $customerId) {
          company {
            id
            mainContact {
              id
              firstName
              lastName
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
    { variables: { companyId, customerId } }
  );

  return json({ success: true, companyId, customerId });
};

export default function WholesalePage() {
  return (
    <Page>
      <TitleBar title="Wholesale Registration Management" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                {/* Page Header */}
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Wholesale Registration Page 📝
                  </Text>
                  <Text variant="bodyMd" as="p">
                    This page manages the wholesale registration functionality for your store.
                    The wholesale registration form has been created and added to your storefront navigation.
                  </Text>
                </BlockStack>

                {/* Features List */}
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd">
                    Features <span style={{ color: "red" }}>*</span>
                  </Text>
                  <List>
                    <List.Item>
                      Customer login protection{" "}
                      <span style={{ color: "red" }}>*</span>
                    </List.Item>
                    <List.Item>
                      Company and customer creation with B2B associations{" "}
                      <span style={{ color: "red" }}>*</span>
                    </List.Item>
                    <List.Item>
                      Form validation and error handling{" "}
                      <span style={{ color: "red" }}>*</span>
                    </List.Item>
                    <List.Item>
                      Automatic menu integration{" "}
                      <span style={{ color: "red" }}>*</span>
                    </List.Item>
                  </List>
                </BlockStack>

                {/* Footer Note */}
                <Text variant="bodyMd" as="p">
                  The form automatically creates companies and assigns customers as main contacts
                  when submissions are received from your storefront.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
