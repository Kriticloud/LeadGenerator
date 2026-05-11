import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Lead } from '../types';

interface LeadScoreChartProps {
  leads: Lead[];
}

export function LeadScoreChart({ leads }: LeadScoreChartProps) {
  const distribution = [
    { range: '0-20', count: 0, color: '#f43f5e' },
    { range: '21-40', count: 0, color: '#fb923c' },
    { range: '41-60', count: 0, color: '#fbbf24' },
    { range: '61-80', count: 0, color: '#22c55e' },
    { range: '81-100', count: 0, color: '#8b5cf6' },
  ];

  leads.forEach((lead) => {
    const score = lead.leadScore;
    if (score <= 20) distribution[0].count++;
    else if (score <= 40) distribution[1].count++;
    else if (score <= 60) distribution[2].count++;
    else if (score <= 80) distribution[3].count++;
    else distribution[4].count++;
  });

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
          <XAxis 
            dataKey="range" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              border: '1px solid #1e293b',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#f1f5f9'
            }}
            itemStyle={{ color: '#8b5cf6' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {distribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
