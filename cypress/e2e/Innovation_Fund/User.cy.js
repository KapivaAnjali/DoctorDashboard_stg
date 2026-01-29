describe('To validate user login and form completion', () => {
    
    // Helper function to check if field is empty, then fill or print
    const verifyAndFill = (selector, value, isSelect = false) => {
        cy.get(selector).then(($el) => {
            const currentValue = isSelect ? $el.val() : $el.val();
            
            if (!currentValue || currentValue.trim() === "" || currentValue.includes('Select')) {
                cy.log(`Filling field: ${selector}`);
                if (isSelect) {
                    cy.wrap($el).select(value);
                } else {
                    cy.wrap($el).type(value);
                }
            } else {
                const msg = `Field [${selector}] already has value: ${currentValue}`;
                console.log(msg);
                cy.log(msg);
            }
        });
    };

    const saveAndNext = () => {
        cy.contains('button', 'Save Draft').click();
        cy.wait(500); // Wait for save sync
        cy.contains('button', 'Next').click();
        cy.wait(1000); // Wait for page transition
    };

    beforeEach(() => {
        cy.visit('https://innovation.kapiva.in/');
        cy.viewport('macbook-16');
    });

    it('To Verify User login and fill application steps', () => {
        // --- LOGIN FLOW ---
        cy.contains('Apply Now').click();
        cy.contains('Login').click();
        cy.get("input[placeholder='your@email.com']").type('sampleuser12@example.com');
        cy.get("input[placeholder='Enter password']").type('password123');
        cy.get("button[type='submit']").click();

        // --- NAVIGATION TO FORM ---
        cy.get('div.flex.flex-wrap.items-center.gap-x-4').first().should('be.visible');
        cy.contains('Continue').click();
        cy.wait(1000);

        // --- STEP 1: Applicant Information ---
        verifyAndFill("input[placeholder='Enter your full name']", "Testing Anjali2");
        verifyAndFill("input[placeholder='Enter your email address']", "sampleuser1@example.com");
        verifyAndFill("input[placeholder='Enter your mobile number']", "9876543210");
        verifyAndFill("input[placeholder='Enter your country']", "India");
        verifyAndFill("input[placeholder='Enter your city']", "Mumbai");
        saveAndNext();

        // --- STEP 2: Organisation details ---
        // Step 8: Dropdown (Research Team)
        verifyAndFill("select.border-gray-200", "Research Team", true); 
        verifyAndFill("input[placeholder='Enter your organisation']", "Tech Solutions Inc");
        verifyAndFill("input[placeholder='e.g., 5 members, 3 core + 2 advisors']", "5 members");
        verifyAndFill("textarea[placeholder='List key team members and their roles...']", "Anjali - Lead, John - Researcher");
        verifyAndFill("textarea[placeholder='List any relevant work...']", "Previous research in wellness tech");
        saveAndNext();

        // --- STEP 3: Project Overview ---
        verifyAndFill("input[placeholder='Enter your project title']", "AI Wellness Tracker");
        verifyAndFill("input[placeholder='A brief one-liner about your project']", "Tracking health via AI");
        // Steps 17 & 18: Dropdowns (Using index if specific IDs are missing)
        cy.get('select').eq(0).then($s => verifyAndFill($s, "Tech-enabled wellness", true));
        cy.get('select').eq(1).then($s => verifyAndFill($s, "Early Research", true));
        saveAndNext();

        // --- STEP 4: Project Details ---
        verifyAndFill("textarea[placeholder='Provide a brief abstract of your project...']", "Abstract content goes here.");
        verifyAndFill("textarea[placeholder='Describe the problem and its significance...']", "The problem is significant because...");
        verifyAndFill("textarea[placeholder='Explain what sets your project apart...']", "Our unique algorithm.");
        saveAndNext();

        // --- STEP 5: Impact ---
        verifyAndFill("textarea[placeholder='What outcomes do you expect if this project succeeds?']", "Improved health outcomes.");
        verifyAndFill("textarea[placeholder='Describe your target beneficiaries...']", "Urban population 25-45.");
        verifyAndFill("textarea[placeholder='Describe the market opportunity and how your solution can scale...']", "Global wellness market.");
        saveAndNext();

        // --- STEP 6: Budget & Timeline ---
        verifyAndFill("input[placeholder='e.g., ₹50,00,000']", "₹10,00,000");
        verifyAndFill("input[placeholder='e.g., 18 months']", "12 months");
        verifyAndFill("textarea[placeholder='List the major milestones and deliverables...']", "M1: Prototype, M2: Testing");
        verifyAndFill("textarea[placeholder='Provide a high-level budget breakdown...']", "R&D: 50%, Marketing: 50%");
        saveAndNext();
        
    });
});