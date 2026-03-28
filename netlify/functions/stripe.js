const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { action, ...data } = JSON.parse(event.body);

    // CREATE CUSTOMER — when agent signs up and adds card
    if (action === 'create_customer') {
      const { email, name, agency, paymentMethodId } = data;

      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { agency }
      });

      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id
      });

      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          customerId: customer.id,
          message: 'Agent payment method saved successfully'
        })
      };
    }

    // CHARGE AGENT — when lead is matched in admin dashboard
    if (action === 'charge_lead') {
      const { customerId, insuranceType, agentName, consumerName, leadId } = data;

      // Lead pricing map
      const LEAD_PRICES = {
        'Auto Insurance': 2500,
        'Homeowners Insurance': 3500,
        'Renters Insurance': 2000,
        'Life Insurance': 5000,
        'Health Insurance': 4500,
        'Medicare': 5000,
        'Other': 3000
      };

      const amount = LEAD_PRICES[insuranceType] || 3000;

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        customer: customerId,
        payment_method: (await stripe.customers.retrieve(customerId)).invoice_settings.default_payment_method,
        confirm: true,
        off_session: true,
        description: `OneCallShield Lead — ${insuranceType} — ${consumerName}`,
        metadata: {
          leadId,
          agentName,
          consumerName,
          insuranceType
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          chargeId: paymentIntent.id,
          amount: amount / 100,
          message: `Successfully charged $${amount / 100} for ${insuranceType} lead`
        })
      };
    }

    // GET AGENT BILLING HISTORY
    if (action === 'get_charges') {
      const { customerId } = data;

      const charges = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 20
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          charges: charges.data.map(c => ({
            id: c.id,
            amount: c.amount / 100,
            status: c.status,
            description: c.description,
            date: new Date(c.created * 1000).toLocaleDateString()
          }))
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid action' })
    };

  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        code: error.code
      })
    };
  }
};
