import React from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export const TipButton = ({ title, children, ...props }) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button aria-label={title} {...props}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent className="bg-[#1A1A1A] text-white text-xs">{title}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
