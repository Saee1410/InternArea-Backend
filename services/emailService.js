import nodemailer from "nodemailer";

// =====================================================
// GMAIL SMTP TRANSPORTER
// =====================================================

const transporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});


// =====================================================
// VERIFY GMAIL CONNECTION
// =====================================================

transporter.verify((error, success) => {

    if (error) {
        console.error(
            "❌ Gmail SMTP connection failed:",
            error.message
        );
    } else {
        console.log("✅ Gmail SMTP is ready");
    }

});


// =====================================================
// SEND RESUME OTP EMAIL
// =====================================================

export const sendOTPEmail = async (email, otp) => {

    try {

        const mailOptions = {

            from: `"InternArea" <${process.env.MAIL_USER}>`,

            to: email,

            subject: "Resume Builder - Email Verification OTP",

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    max-width: 600px;
                    margin: auto;
                ">

                    <h2>Resume Builder</h2>

                    <p>
                        Your OTP for email verification is:
                    </p>

                    <h1 style="
                        letter-spacing: 8px;
                        text-align: center;
                        background: #f4f4f4;
                        padding: 15px;
                    ">
                        ${otp}
                    </h1>

                    <p>
                        This OTP is valid for 5 minutes.
                    </p>

                    <p>
                        If you did not request this OTP,
                        please ignore this email.
                    </p>

                </div>
            `,
        };


        const info = await transporter.sendMail(mailOptions);


        console.log("✅ Resume OTP email sent successfully");
        console.log("📧 To:", email);
        console.log("📨 Message ID:", info.messageId);


        return true;

    } catch (error) {

        console.error(
            "❌ Resume OTP Email Error:",
            error.message
        );

        return false;
    }
};


// =====================================================
// SEND FORGOT PASSWORD EMAIL
// =====================================================

export const sendForgotPasswordEmail = async (
    email,
    newPassword
) => {

    try {

        const mailOptions = {

            from: `"InternArea" <${process.env.MAIL_USER}>`,

            to: email,

            subject: "Internshala - Password Reset",

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    max-width: 600px;
                    margin: auto;
                ">

                    <h2>Password Reset</h2>

                    <p>
                        Your new password is:
                    </p>

                    <h2 style="
                        background: #f4f4f4;
                        padding: 15px;
                        text-align: center;
                    ">
                        ${newPassword}
                    </h2>

                    <p>
                        Please login using this password
                        and change it from your profile.
                    </p>

                    <p>
                        If you did not request a password reset,
                        please contact support immediately.
                    </p>

                </div>
            `,
        };


        const info = await transporter.sendMail(mailOptions);


        console.log(
            "✅ Forgot Password email sent successfully"
        );

        console.log("📧 To:", email);
        console.log("📨 Message ID:", info.messageId);


        return true;

    } catch (error) {

        console.error(
            "❌ Forgot Password Email Error:",
            error.message
        );

        return false;
    }
};

/// SEND FRENC LANGUAGE OTP EMAIL

export const sendFrenchLanguageOTP = async (email, otp) => {
    try {
        const mailOptions = {
            from : `"InternArea" <${process.env.MAIL_USER}>`,
            to: email,
            subject: "InternArea - Freanch Language OTP Verification",

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    max-width: 600px;
                    margin: auto;
                ">
                <h2>Freanch Language Verification</h2>
                <p>
                  you requested to switch your InterArea language
                  to French.
                </p>

                <p>
                    Your verification OTP is:
                </p>

                <h1 style="
                    letter-spacing: 8px;
                    text-align: center;
                    background: #f4f4f4;
                    padding: 15px;
                ">
                    ${otp}
                </h1>

                <p>
                 This OTP is valid for 5 minutes.
                 </p> 
                 <p>
                  If you did not request this verification, please ignore this email. 
                  </p>
                </div>
                `,

        };
        const info = await transporter.sendMail(mailOptions);

        console.log("✅ French Language OTP email sent successfully");
        console.log("📧 To:", email);
        console.log("📨 Message ID:", info.messageId);

        return true;

    } catch (error) {
            console.error(
                "Freanch Language OTP Email Error:",
                error.message
            );

            return false;
        
    }
}


// =====================================================
// SEND SUBSCRIPTION INVOICE EMAIL
// =====================================================

export const sendSubscriptionInvoiceEmail = async (
    email,
    plan,
    amount,
    paymentId,
    orderId,
    startDate,
    endDate
) => {

    try {

        const mailOptions = {

            from: `"InternArea" <${process.env.MAIL_USER}>`,

            to: email,

            subject: "InternArea - Subscription Payment Successful",

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    max-width: 600px;
                    margin: auto;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                ">

                    <h2 style="color: #1976d2;">
                        InternArea Subscription
                    </h2>

                    <p>
                        Hello,
                    </p>

                    <p>
                        Your subscription payment was successful
                        and your plan has been activated.
                    </p>

                    <div style="
                        background: #f8fafc;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    ">

                        <h3>Payment Details</h3>

                        <p>
                            <strong>Plan:</strong>
                            ${plan.toUpperCase()}
                        </p>

                        <p>
                            <strong>Amount:</strong>
                            ₹${amount}
                        </p>

                        <p>
                            <strong>Payment ID:</strong>
                            ${paymentId}
                        </p>

                        <p>
                            <strong>Order ID:</strong>
                            ${orderId}
                        </p>

                        <p>
                            <strong>Start Date:</strong>
                            ${new Date(startDate).toLocaleDateString("en-IN")}
                        </p>

                        <p>
                            <strong>End Date:</strong>
                            ${new Date(endDate).toLocaleDateString("en-IN")}
                        </p>

                    </div>

                    <p>
                        Thank you for choosing InternArea.
                    </p>

                    <p style="color: #666;">
                        This email serves as your subscription
                        payment confirmation.
                    </p>

                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);

        console.log(
            "✅ Subscription Invoice email sent successfully"
        );

        console.log("📧 To:", email);
        console.log("📨 Message ID:", info.messageId);

        return true;

    } catch (error) {

        console.error(
            "❌ Subscription Invoice Email Error:",
            error.message
        );

        return false;
    }
};