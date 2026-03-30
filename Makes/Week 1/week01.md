# Week 1 – Reverse Engineering

## The Artifact
Project Chosen: Midjourney (https://www.midjourney.com/)
1. What Is Being Made? - This project generates images when given a prompt and is able to edit and animate generated images with further prompting. The output is an image or short animation of the prompter’s choice of size.
2. What Is the Project Made From? (Data) - The AI was trained with a dataset of over 5 billion images with text descriptions from all over the internet. This dataset includes copyrighted artwork and photos of real people, neither of which consented to the use of their images for AI training purposes. This has led to Midjourney being the subject of several lawsuits from both individuals and large corporations, such as Universal Pictures and Disney. 
3. Tools, Algorithms, or Systems - Midjourney is a combination of a large language and diffusion model. The language model converts the user’s prompt into a vector, which is essentially the prompt in numerical form. The diffusion model uses this vector to guide the image generation. Diffusion generation works by having an AI add random noise into its training dataset, then recover the original images by reversing the noise. This allows it to generate new images by starting with a field of noise and subtracting pieces  little by little until it matches the vector’s (prompt’s) instructions. Similar to other image generation algorithms, the process is made to look and feel automated, but is actually the result of human engineering and choice of training datasets.
4. Human Labor & Decisions - Humans designed the program responsible for collecting usable training images from all over the internet. After building Midjourney and giving it the training images, it decided when it generated images were similar enough to be outputted. (Training image → add noise → subtract bits noise → compare to original; if similar enough, then image can be outputted. When finished training, users’ prompts ‘call’ training images by their text description, which is used to generate a new image with mixed features/styles/etc.. Humans had the largest influence during the training phase, by deciding which images to use to train Midjourney.
5. Design as Argument - The interface is a simple text box in which the user types their prompt. The user can watch their image being generated and view the process turning from visual noise to an image of their prompt. It feels similar to watching a painter in high speed, showing us a simplified version of the intricate moving parts behind the scenes, making the AI feel more natural and giving it a human touch.

## Process Notes
How did you make this?
What tools did you use?
What decisions did you make?

## Reflection
“Making,” in terms of this project, is a definitive joint effort between the machine and a human. The machine initiates nothing on its own, rather relying on the prompt of a human user to base its image generation off of. The user can then use the machine to edit their image, giving humans a bigger part in the process of “making.” This means that even though the machine itself cannot make any judgements about its images’ value or realism, humans are able to change these images to suit our ideas of worthiness or value. Although the machine does the majority of the visible work, that is only possible because of the immense amount of human effort put into creating, maintaining, and updating the program with new features and training images that better reflect current trends. When machines partake in this variation of “making,” it can diminish the value of efforts made solely by real people, such as artists and photographers. It can also infringe on intellectual property rights when training images are used without permission or compensation. This muddles ownership rights whenever a user generates an image, since they entered the prompt but the image was generated using others’ works. Finally, while this machine makes creating art more accessible, it can also foster a creative skill void. After all, if a machine can do it in seconds given only a single sentence, the urge to practice a new skill such as painting becomes less appealing, as it is more difficult to do.

## Attribution & AI Use
- Tools used:
- AI prompts (summary):
- What AI generated:
- What you changed or decided: